import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import {
  Badge,
  Button,
  Card,
  Empty,
  Icon,
  KIND_ICON,
  KIND_LABEL,
  Skeleton,
  Spinner,
} from "../ui";
import PageHeader from "./PageHeader";

const SAMPLE = `INT. WAREHOUSE - NIGHT
A vintage Mustang idles under a single work lamp. NADIA (30s), grease on
her hands, listens to a police scanner. Rain hammers the tin roof.

EXT. HARBOUR PIER - DAWN
A cargo drone lifts a shipping container. Two DIVERS surface beside it.
We need a working pier, a picture-car Mustang, a drone operator, marine
safety cover and a night shoot permit for the warehouse district.`;

export default function Diagnosis({ productionId }: { productionId: Id<"productions"> }) {
  const production = useQuery(api.productions.get, { productionId });
  const items = useQuery(api.breakdown.listItems, { productionId });
  const contacts = useQuery(api.contacts.list, { productionId });

  const addScript = useMutation(api.breakdown.addScript);
  const runDiagnosis = useAction(api.breakdown.run);
  const findContacts = useAction(api.contacts.find);
  const createErrand = useMutation(api.errands.create);
  const startOutreach = useAction(api.agent.startOutreach);
  const provisionInbox = useAction(api.productions.provisionInbox);

  const [script, setScript] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [openGap, setOpenGap] = useState<Id<"breakdownItems"> | null>(null);
  const [query, setQuery] = useState("");

  async function guard(key: string, fn: () => Promise<string | void>) {
    setBusy(key);
    setNote(null);
    try {
      const msg = await fn();
      if (msg) setNote({ text: msg, kind: "ok" });
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : String(e), kind: "err" });
    } finally {
      setBusy(null);
    }
  }

  async function diagnose() {
    await guard("diagnose", async () => {
      if (script.trim()) await addScript({ productionId, title: "Script", text: script });
      const res = await runDiagnosis({ productionId });
      return `Diagnosis complete. Found ${res.count} production needs.`;
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
      setOpenGap(null);
      return res.sent ? "Outreach sent from your inbox." : res.note ?? "Could not send.";
    });
  }

  const grouped = (items ?? []).reduce<Record<string, Doc<"breakdownItems">[]>>((acc, it) => {
    (acc[it.category] ??= []).push(it);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort();
  const hasInbox = !!production?.inboxId;

  return (
    <div className="p-6">
      <PageHeader
        title="Diagnosis"
        subtitle="Paste the script. The doctor reads it and lists every gap to cure."
      />

      {note && (
        <p
          className={`mb-4 rounded-lg px-3 py-2 text-xs ${
            note.kind === "err" ? "bg-rose-500/10 text-rose-300" : "bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {note.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
        {/* Script intake */}
        <div className="space-y-4" data-tour="diagnosis-intake">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Script or treatment</h3>
              <button
                onClick={() => setScript(SAMPLE)}
                className="text-[11px] text-white/40 hover:text-white/70"
              >
                Use sample
              </button>
            </div>
            <textarea
              className="mt-3 h-56 w-full resize-none rounded-lg border border-white/15 bg-transparent p-3 text-sm outline-none focus:border-emerald-400/60"
              placeholder="INT. WAREHOUSE - NIGHT. A vintage Mustang idles..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
            <Button className="mt-2 w-full" disabled={busy === "diagnose"} onClick={diagnose}>
              {busy === "diagnose" ? (
                <>
                  <Spinner /> Reading the script...
                </>
              ) : (
                <>
                  <Icon.Sparkles className="h-4 w-4" /> Run diagnosis
                </>
              )}
            </Button>
            <p className="mt-2 text-[11px] leading-relaxed text-white/35">
              OpenAI reads the text as a line producer and extracts every concrete need,
              categorised and scene-referenced.
            </p>
          </Card>

          {!hasInbox && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold">Production inbox</h3>
              <p className="mt-1 text-xs text-white/45">
                Provision an AgentMail inbox so the doctor can send and receive on this production's
                behalf.
              </p>
              <Button
                variant="ghost"
                className="mt-3 w-full"
                disabled={busy === "inbox"}
                onClick={() =>
                  guard("inbox", async () => {
                    const r = await provisionInbox({ productionId });
                    return `Inbox ready: ${r.inboxAddress}`;
                  })
                }
              >
                {busy === "inbox" ? <Spinner /> : "Provision inbox"}
              </Button>
            </Card>
          )}
        </div>

        {/* Breakdown */}
        <div>
          {items === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Empty
              icon={<Icon.Stethoscope className="h-8 w-8" />}
              title="No diagnosis yet"
              body="Paste a script on the left and run the diagnosis to see every production gap here."
            />
          ) : (
            <div className="space-y-4">
              {categories.map((cat) => (
                <Card key={cat} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span>{KIND_ICON[cat] ?? "•"}</span>
                      {KIND_LABEL[cat] ?? cat}
                    </span>
                    <Badge tone="gap">{grouped[cat].length} gaps</Badge>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {grouped[cat].map((item) => (
                      <li key={item._id} className="rounded-lg bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            {item.detail && (
                              <p className="truncate text-xs text-white/40">{item.detail}</p>
                            )}
                            {item.sceneRefs && item.sceneRefs.length > 0 && (
                              <p className="mt-0.5 text-[11px] text-white/30">
                                {item.sceneRefs.join(", ")}
                              </p>
                            )}
                          </div>
                          <Button
                            variant={openGap === item._id ? "subtle" : "ghost"}
                            size="sm"
                            onClick={() => {
                              setOpenGap(openGap === item._id ? null : item._id);
                              setQuery("");
                            }}
                          >
                            {openGap === item._id ? "Close" : "Cure"}
                          </Button>
                        </div>

                        {openGap === item._id && (
                          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                            <div className="flex gap-2">
                              <input
                                className="flex-1 rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-emerald-400/60"
                                placeholder={`Search the web: ${item.name} near...`}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy === "find"}
                                onClick={() =>
                                  guard("find", async () => {
                                    const r = await findContacts({
                                      productionId,
                                      kind: item.category,
                                      query: query || item.name,
                                    });
                                    return `Firecrawl sourced ${r.found} contact${r.found === 1 ? "" : "s"}.`;
                                  })
                                }
                              >
                                {busy === "find" ? <Spinner /> : <><Icon.Search className="h-3.5 w-3.5" /> Find</>}
                              </Button>
                            </div>
                            <div className="space-y-1">
                              {(contacts ?? []).map((c) => (
                                <div
                                  key={c._id}
                                  className="flex items-center justify-between gap-2 rounded-md bg-white/[0.04] px-2.5 py-1.5"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-medium">{c.name}</p>
                                    <p className="truncate text-[11px] text-white/40">{c.email}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    disabled={busy === `email-${c._id}`}
                                    title={hasInbox ? "Send outreach" : "Provision the inbox first"}
                                    onClick={() => email(item, c)}
                                  >
                                    {busy === `email-${c._id}` ? <Spinner /> : "Email"}
                                  </Button>
                                </div>
                              ))}
                              {contacts?.length === 0 && (
                                <p className="text-[11px] text-white/40">
                                  No contacts yet. Search above to source some with Firecrawl.
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
          )}
        </div>
      </div>
    </div>
  );
}
