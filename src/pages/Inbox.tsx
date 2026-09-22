import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge, Button, Card, Empty, Icon, Skeleton, Spinner, ago, cx } from "../ui";
import PageHeader from "./PageHeader";

export default function InboxPage({ productionId }: { productionId: Id<"productions"> }) {
  const production = useQuery(api.productions.get, { productionId });
  const board = useQuery(api.errands.board, { productionId });
  const provisionInbox = useAction(api.productions.provisionInbox);

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const hasInbox = !!production?.inboxId;

  // Threads with any message, most recent first.
  const threads = (board ?? [])
    .filter((e) => e.lastMessage)
    .sort((a, b) => (b.lastMessage!.sentAt ?? 0) - (a.lastMessage!.sentAt ?? 0));

  const sent = (board ?? []).filter((e) => e.lastOutboundAt).length;
  const replies = (board ?? []).filter((e) => e.lastInboundAt).length;

  return (
    <div className="p-6">
      <PageHeader
        title="Inbox"
        subtitle="The real mailbox this production sends from, powered by AgentMail."
      />

      {note && <p className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{note}</p>}

      {production === undefined ? (
        <Skeleton className="h-28" />
      ) : (
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={cx(
                  "grid h-11 w-11 place-items-center rounded-xl",
                  hasInbox ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40",
                )}
              >
                <Icon.Inbox className="h-5 w-5" />
              </span>
              <div>
                {hasInbox ? (
                  <>
                    <p className="text-sm font-semibold">{production.inboxAddress}</p>
                    <p className="text-xs text-white/45">
                      Live inbox · sends, receives and threads every reply
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold">No inbox yet</p>
                    <p className="text-xs text-white/45">
                      Provision one so the doctor can email on this production's behalf.
                    </p>
                  </>
                )}
              </div>
            </div>
            {hasInbox ? (
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-xl font-semibold tabular-nums text-white">{sent}</p>
                  <p className="text-[11px] text-white/40">threads sent</p>
                </div>
                <div>
                  <p className="text-xl font-semibold tabular-nums text-sky-300">{replies}</p>
                  <p className="text-[11px] text-white/40">with replies</p>
                </div>
              </div>
            ) : (
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setNote(null);
                  try {
                    const r = await provisionInbox({ productionId });
                    setNote(`Inbox ready: ${r.inboxAddress}`);
                  } catch (e) {
                    setNote(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? <Spinner /> : "Provision inbox"}
              </Button>
            )}
          </div>
        </Card>
      )}

      <h3 className="mb-3 text-sm font-semibold">Threads</h3>
      {board === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <Empty
          icon={<Icon.Mail className="h-8 w-8" />}
          title="No threads yet"
          body="Once outreach goes out, every conversation shows up here with its latest message."
        />
      ) : (
        <div className="space-y-2">
          {threads.map((e) => {
            const m = e.lastMessage!;
            const inbound = m.direction === "inbound";
            return (
              <Card key={e._id} className="flex items-start gap-3 p-3">
                <span
                  className={cx(
                    "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs",
                    inbound ? "bg-sky-500/15 text-sky-300" : "bg-emerald-500/15 text-emerald-300",
                  )}
                >
                  {inbound ? "↩" : "→"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{e.contact?.name ?? "Contact"}</p>
                    <Badge tone={e.status}>{e.status}</Badge>
                  </div>
                  <p className="truncate text-xs text-white/40">{e.subject}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-white/50">{m.body}</p>
                </div>
                <span className="shrink-0 text-[11px] text-white/30">{ago(m.sentAt)}</span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
