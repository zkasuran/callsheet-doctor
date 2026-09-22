import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Avatar,
  Badge,
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
        subtitle="Every outreach errand, moving on its own as replies arrive. Click a card for the thread."
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
                    <Card
                      key={e._id}
                      interactive
                      className="p-2.5"
                    >
                      <button
                        className="block w-full text-left"
                        onClick={() => setOpenErrand(e._id)}
                      >
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

      {openErrand && (
        <ErrandDrawer errandId={openErrand} onClose={() => setOpenErrand(null)} />
      )}
    </div>
  );
}

/* ---------- Errand detail drawer with the full email thread ---------- */

function ErrandDrawer({
  errandId,
  onClose,
}: {
  errandId: Id<"errands">;
  onClose: () => void;
}) {
  const errand = useQuery(api.errands.get, { errandId });
  const messages = useQuery(api.errands.messagesFor, { errandId });

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

        {/* Goal */}
        {errand && (
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-white/35">Goal</p>
            <p className="mt-0.5 text-sm text-white/70">{errand.goal}</p>
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
              body="The outreach email will appear here once it is sent."
            />
          ) : (
            messages.map((m) => {
              const inbound = m.direction === "inbound";
              return (
                <div
                  key={m._id}
                  className={cx("flex gap-2.5", inbound ? "flex-row" : "flex-row-reverse")}
                >
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
                      {m.subject && (
                        <p className="mb-1 text-[11px] font-medium text-white/40">{m.subject}</p>
                      )}
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

        <div className="border-t border-white/10 px-4 py-3 text-center text-[11px] text-white/35">
          The doctor reads replies and answers on its own. This thread updates live.
        </div>
      </aside>
    </div>
  );
}
