import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Icon,
  KIND_ICON,
  KIND_LABEL,
  Skeleton,
  Spinner,
  STATUS_LABEL,
  ago,
  cx,
} from "../ui";
import PageHeader from "./PageHeader";

const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: "drafting", label: "Drafting", statuses: ["draft"] },
  { key: "waiting", label: "Waiting", statuses: ["waiting", "sent"] },
  { key: "replied", label: "Replied", statuses: ["replied"] },
  { key: "negotiating", label: "Negotiating", statuses: ["negotiating"] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "closed", label: "Closed", statuses: ["declined", "closed"] },
];

export default function Pipeline({ productionId }: { productionId: Id<"productions"> }) {
  const board = useQuery(api.errands.board, { productionId });
  const [openErrand, setOpenErrand] = useState<Id<"errands"> | null>(null);

  return (
    <div className="p-6">
      <PageHeader
        title="Pipeline"
        subtitle="Every outreach errand, moving on its own as replies arrive. Click a card to reply, set status or accept a quote."
      />

      {board === undefined ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : board.length === 0 ? (
        <Empty
          icon={<Icon.Board className="h-8 w-8" />}
          title="The board is empty"
          body="Run a diagnosis and cure a gap to open the first errand here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {COLUMNS.map((col) => {
            const cards = board.filter((e) => col.statuses.includes(e.status));
            return (
              <div key={col.key} className="min-w-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-medium text-white/60">{col.label}</span>
                  <span className="rounded-full bg-white/8 px-1.5 text-[11px] tabular-nums text-white/45">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cards.map((e) => (
                    <Card key={e._id} interactive className="p-2.5">
                      <button className="block w-full text-left" onClick={() => setOpenErrand(e._id)}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/50">
                            {KIND_ICON[e.kind] ?? "•"} {KIND_LABEL[e.kind] ?? e.kind}
                          </span>
                          {e.lastInboundAt && (
                            <span className="text-[10px] text-white/30">{ago(e.lastInboundAt)}</span>
                          )}
                        </div>
                        <p className="mt-1.5 truncate text-xs font-medium">
                          {e.contact?.name ?? "Contact"}
                        </p>
                        {e.lastMessage && (
                          <p className="mt-1 line-clamp-2 text-[11px] text-white/40">
                            {e.lastMessage.direction === "inbound" ? "↩ " : "→ "}
                            {e.lastMessage.body}
                          </p>
                        )}
                      </button>
                    </Card>
                  ))}
                  {cards.length === 0 && (
                    <div className="rounded-lg border border-dashed border-white/8 py-6 text-center text-[11px] text-white/25">
                      empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openErrand && <ErrandDrawer errandId={openErrand} onClose={() => setOpenErrand(null)} />}
    </div>
  );
}

/* ---------- Interactive errand cockpit ---------- */

const STATUS_ACTIONS: { status: string; label: string; variant: "primary" | "ghost" | "danger" | "subtle" }[] = [
  { status: "confirmed", label: "Confirm", variant: "primary" },
  { status: "negotiating", label: "Negotiating", variant: "subtle" },
  { status: "declined", label: "Decline", variant: "danger" },
  { status: "closed", label: "Close", variant: "ghost" },
];

function ErrandDrawer({ errandId, onClose }: { errandId: Id<"errands">; onClose: () => void }) {
  const errand = useQuery(api.errands.get, { errandId });
  const messages = useQuery(api.errands.messagesFor, { errandId });
  const quotes = useQuery(api.errands.quotesFor, { errandId });

  const setStatus = useMutation(api.errands.setStatus);
  const decideQuote = useMutation(api.errands.decideQuote);
  const sendReply = useAction(api.agent.reply);
  const draftReply = useAction(api.agent.draftReply);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

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

  const currency = quotes?.[0]?.currency ?? "USD";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0e141b] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            {errand === undefined ? (
              <Skeleton className="h-5 w-40" />
            ) : errand ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{KIND_ICON[errand.kind] ?? "•"}</span>
                  <span className="text-xs text-white/50">{KIND_LABEL[errand.kind] ?? errand.kind}</span>
                  <Badge tone={errand.status}>{STATUS_LABEL[errand.status] ?? errand.status}</Badge>
                </div>
                <p className="mt-1 truncate text-sm font-semibold">{errand.subject}</p>
                <p className="truncate text-xs text-white/45">
                  {errand.contact?.name}
                  {errand.contact?.email ? ` · ${errand.contact.email}` : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-white/50">Errand not found</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/50 hover:bg-white/5 hover:text-white/80"
            aria-label="Close"
          >
            <Icon.Close className="h-4 w-4" />
          </button>
        </div>

        {/* Status action bar */}
        {errand && (
          <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-4 py-2.5">
            {STATUS_ACTIONS.map((a) => (
              <Button
                key={a.status}
                size="sm"
                variant={errand.status === a.status ? "primary" : a.variant}
                disabled={busy === `status-${a.status}` || errand.status === a.status}
                onClick={() =>
                  guard(`status-${a.status}`, async () => {
                    await setStatus({ errandId, status: a.status as any });
                    return `Marked ${a.label.toLowerCase()}.`;
                  })
                }
              >
                {busy === `status-${a.status}` ? <Spinner /> : a.label}
              </Button>
            ))}
          </div>
        )}

        {note && (
          <p
            className={cx(
              "mx-4 mt-3 rounded-lg px-3 py-2 text-xs",
              note.kind === "err" ? "bg-rose-500/10 text-rose-300" : "bg-emerald-500/10 text-emerald-300",
            )}
          >
            {note.text}
          </p>
        )}

        {/* Goal + quotes */}
        {errand && (
          <div className="space-y-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/35">Goal</p>
              <p className="mt-0.5 text-sm text-white/70">{errand.goal}</p>
            </div>
            {quotes && quotes.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/35">Quotes</p>
                <div className="mt-1.5 space-y-1.5">
                  {quotes.map((q) => (
                    <div
                      key={q._id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tabular-nums text-white/85">
                          {q.currency} {q.amount.toLocaleString()}
                        </p>
                        {q.terms && <p className="truncate text-[11px] text-white/45">{q.terms}</p>}
                      </div>
                      {q.status === "proposed" ? (
                        <div className="flex shrink-0 gap-1.5">
                          <Button
                            size="sm"
                            disabled={busy === `q-${q._id}`}
                            onClick={() =>
                              guard(`q-${q._id}`, async () => {
                                await decideQuote({ quoteId: q._id, decision: "accepted" });
                                return `Accepted ${q.currency} ${q.amount.toLocaleString()}.`;
                              })
                            }
                          >
                            {busy === `q-${q._id}` ? <Spinner /> : "Accept"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === `q-${q._id}`}
                            onClick={() =>
                              guard(`q-${q._id}`, async () => {
                                await decideQuote({ quoteId: q._id, decision: "rejected" });
                                return "Quote rejected.";
                              })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Badge tone={q.status === "accepted" ? "confirmed" : "declined"}>
                          {q.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Thread */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages === undefined ? (
            <div className="grid place-items-center py-10 text-white/40">
              <Spinner className="h-5 w-5" />
            </div>
          ) : messages.length === 0 ? (
            <Empty
              icon={<Icon.Mail className="h-7 w-7" />}
              title="No messages yet"
              body="Write the first email below, or use Draft with AI."
            />
          ) : (
            messages.map((m) => {
              const inbound = m.direction === "inbound";
              return (
                <div key={m._id} className={cx("flex gap-2.5", inbound ? "flex-row" : "flex-row-reverse")}>
                  <Avatar name={inbound ? errand?.contact?.name ?? "Vendor" : "Callsheet Doctor"} />
                  <div className={cx("max-w-[85%]", inbound ? "text-left" : "text-right")}>
                    <div
                      className={cx(
                        "rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed",
                        inbound
                          ? "rounded-tl-sm bg-white/[0.06] text-white/85"
                          : "rounded-tr-sm bg-emerald-500/12 text-emerald-50",
                      )}
                    >
                      {m.subject && <p className="mb-1 text-[11px] font-medium text-white/40">{m.subject}</p>}
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>
                    <p className="mt-1 text-[10px] text-white/30">
                      {inbound ? "Received" : "Sent"} · {ago(m.sentAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply composer */}
        <div className="border-t border-white/10 p-3">
          <textarea
            className="h-20 w-full resize-none rounded-lg border border-white/15 bg-transparent p-2.5 text-sm outline-none focus:border-emerald-400/60"
            placeholder="Write a reply, or draft one with AI..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy === "draft"}
              onClick={() =>
                guard("draft", async () => {
                  const r = await draftReply({ errandId });
                  setText(r.text);
                })
              }
            >
              {busy === "draft" ? <Spinner /> : <><Icon.Sparkles className="h-3.5 w-3.5" /> Draft with AI</>}
            </Button>
            <Button
              size="sm"
              disabled={busy === "send" || !text.trim()}
              onClick={() =>
                guard("send", async () => {
                  const r = await sendReply({ errandId, text });
                  if (r.sent) {
                    setText("");
                    return "Reply sent.";
                  }
                  throw new Error(r.note ?? "Could not send.");
                })
              }
            >
              {busy === "send" ? <Spinner /> : <><Icon.Mail className="h-3.5 w-3.5" /> Send</>}
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-white/30">
            {currency && quotes && quotes.length > 0 ? "Accepted quotes feed the budget. " : ""}
            Sends from the production inbox and threads live.
          </p>
        </div>
      </aside>
    </div>
  );
}
