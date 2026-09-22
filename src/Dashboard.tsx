import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id, Doc } from "../convex/_generated/dataModel";
import { Button, Card, Badge, Spinner, KIND_LABEL } from "./ui";

const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: "drafting", label: "Drafting", statuses: ["draft"] },
  { key: "waiting", label: "Waiting", statuses: ["waiting", "sent"] },
  { key: "replied", label: "Replied", statuses: ["replied"] },
  { key: "negotiating", label: "Negotiating", statuses: ["negotiating"] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "closed", label: "Closed", statuses: ["declined", "closed"] },
];

export default function Dashboard({ productionId }: { productionId: Id<"productions"> }) {
  const production = useQuery(api.productions.get, { productionId });
  const items = useQuery(api.breakdown.listItems, { productionId });
  const contacts = useQuery(api.contacts.list, { productionId });
  const board = useQuery(api.errands.board, { productionId });
  const budget = useQuery(api.errands.budget, { productionId });

  const addScript = useMutation(api.breakdown.addScript);
  const runDiagnosis = useAction(api.breakdown.run);
  const provisionInbox = useAction(api.productions.provisionInbox);
  const findContacts = useAction(api.contacts.find);
  const createErrand = useMutation(api.errands.create);
  const startOutreach = useAction(api.agent.startOutreach);

  const [script, setScript] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [openGap, setOpenGap] = useState<Id<"breakdownItems"> | null>(null);
  const [query, setQuery] = useState("");

  async function guard(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setNote(null);
    try {
      await fn();
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function diagnose() {
    await guard("diagnose", async () => {
      if (script.trim()) {
        await addScript({ productionId, title: "Script", text: script });
      }
      const res = await runDiagnosis({ productionId });
      setNote(`Diagnosis found ${res.count} needs.`);
    });
  }

  async function email(item: Doc<"breakdownItems">, contact: Doc<"contacts">) {
    await guard(`email-${contact._id}`, async () => {
      const errandId = await createErrand({
        productionId,
        contactId: contact._id,
        kind: item.category,
        subject: `${production?.name ?? "Production"}: ${item.name}`,
        goal: item.detail || item.name,
        breakdownItemId: item._id,
      });
      const res = await startOutreach({ errandId });
      setNote(res.sent ? "Outreach sent." : res.note ?? "Could not send.");
      setOpenGap(null);
    });
  }

  const grouped = (items ?? []).reduce<Record<string, Doc<"breakdownItems">[]>>((acc, it) => {
    (acc[it.category] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* header strip */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[12rem]">
          <h2 className="text-xl font-semibold">{production?.name ?? "..."}</h2>
          {production?.logline && <p className="text-sm text-white/45">{production.logline}</p>}
        </div>
        {production && !production.inboxId ? (
          <Button
            variant="ghost"
            disabled={busy === "inbox"}
            onClick={() => guard("inbox", async () => void (await provisionInbox({ productionId })))}
          >
            {busy === "inbox" ? <Spinner /> : "Provision inbox"}
          </Button>
        ) : (
          production?.inboxAddress && (
            <Badge tone="confirmed">inbox: {production.inboxAddress}</Badge>
          )
        )}
        {budget && (
          <Card className="px-4 py-2 text-sm">
            <span className="text-white/45">Budget </span>
            <span className="font-semibold text-emerald-300">
              {budget.currency} {budget.accepted.toLocaleString()}
            </span>
            <span className="text-white/40"> confirmed / </span>
            <span className="text-amber-300">{budget.proposed.toLocaleString()}</span>
            <span className="text-white/40"> quoted</span>
          </Card>
        )}
      </div>

      {note && <p className="text-xs text-white/60 rounded-lg bg-white/5 px-3 py-2">{note}</p>}

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        {/* diagnosis */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Diagnose the production</h3>
            <p className="mt-1 text-xs text-white/45">
              Paste the script or a treatment. The doctor reads it and lists every gap to cure.
            </p>
            <textarea
              className="mt-3 h-32 w-full resize-none rounded-lg border border-white/15 bg-transparent p-2.5 text-sm outline-none focus:border-emerald-400/60"
              placeholder="INT. WAREHOUSE - NIGHT. A vintage Mustang idles..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
            <Button className="mt-2 w-full" disabled={busy === "diagnose"} onClick={diagnose}>
              {busy === "diagnose" ? <Spinner /> : "Run diagnosis"}
            </Button>
          </Card>

          {Object.entries(grouped).map(([cat, list]) => (
            <Card key={cat} className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  {KIND_LABEL[cat] ?? cat}
                </span>
                <Badge tone="gap">{list.length}</Badge>
              </div>
              <ul className="mt-2 space-y-2">
                {list.map((item) => (
                  <li key={item._id} className="rounded-lg bg-white/[0.03] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{item.name}</p>
                        {item.detail && (
                          <p className="truncate text-xs text-white/40">{item.detail}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setOpenGap(openGap === item._id ? null : item._id)}
                      >
                        Cure
                      </Button>
                    </div>

                    {openGap === item._id && (
                      <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-xs outline-none focus:border-emerald-400/60"
                            placeholder={`Search: ${item.name} near...`}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            disabled={busy === "find"}
                            onClick={() =>
                              guard("find", async () => {
                                const r = await findContacts({
                                  productionId,
                                  kind: item.category,
                                  query: query || item.name,
                                });
                                setNote(`Firecrawl found ${r.found} contacts.`);
                              })
                            }
                          >
                            {busy === "find" ? <Spinner /> : "Find"}
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {(contacts ?? []).map((c) => (
                            <div
                              key={c._id}
                              className="flex items-center justify-between gap-2 rounded-md bg-white/[0.04] px-2 py-1"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs">{c.name}</p>
                                <p className="truncate text-[11px] text-white/40">{c.email}</p>
                              </div>
                              <Button
                                disabled={busy === `email-${c._id}`}
                                onClick={() => email(item, c)}
                              >
                                {busy === `email-${c._id}` ? <Spinner /> : "Email"}
                              </Button>
                            </div>
                          ))}
                          {contacts?.length === 0 && (
                            <p className="text-[11px] text-white/40">
                              No contacts yet. Search to source some.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* the live chart */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">Production chart</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {COLUMNS.map((col) => {
              const cards = (board ?? []).filter((e) => col.statuses.includes(e.status));
              return (
                <div key={col.key} className="min-w-0">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-white/60">{col.label}</span>
                    <span className="text-xs text-white/30">{cards.length}</span>
                  </div>
                  <div className="space-y-2">
                    {cards.map((e) => (
                      <Card key={e._id} className="p-2.5">
                        <div className="flex items-center justify-between">
                          <Badge tone={e.status}>{KIND_LABEL[e.kind] ?? e.kind}</Badge>
                        </div>
                        <p className="mt-1.5 truncate text-xs font-medium">
                          {e.contact?.name ?? "contact"}
                        </p>
                        {e.lastMessage && (
                          <p className="mt-1 line-clamp-2 text-[11px] text-white/40">
                            {e.lastMessage.direction === "inbound" ? "↩ " : "→ "}
                            {e.lastMessage.body}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {board?.length === 0 && (
            <p className="mt-6 text-sm text-white/40">
              No errands yet. Diagnose the production, then cure a gap to send the first email.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
