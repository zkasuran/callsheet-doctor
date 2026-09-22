import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Badge,
  Button,
  Card,
  Empty,
  Icon,
  KIND_ICON,
  KIND_LABEL,
  Progress,
  Skeleton,
  Stat,
  STATUS_LABEL,
  ago,
  cx,
} from "../ui";
import PageHeader from "./PageHeader";

type Page = "overview" | "diagnosis" | "pipeline" | "contacts" | "inbox";

const FUNNEL: { key: string; label: string; statuses: string[]; tone: string }[] = [
  { key: "drafting", label: "Drafting", statuses: ["draft"], tone: "white" },
  { key: "waiting", label: "Waiting", statuses: ["waiting", "sent"], tone: "amber" },
  { key: "replied", label: "Replied", statuses: ["replied"], tone: "sky" },
  { key: "negotiating", label: "Negotiating", statuses: ["negotiating"], tone: "violet" },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"], tone: "emerald" },
];

export default function Overview({
  productionId,
  onNavigate,
}: {
  productionId: Id<"productions">;
  onNavigate: (p: Page) => void;
}) {
  const production = useQuery(api.productions.get, { productionId });
  const items = useQuery(api.breakdown.listItems, { productionId });
  const contacts = useQuery(api.contacts.list, { productionId });
  const board = useQuery(api.errands.board, { productionId });
  const budget = useQuery(api.errands.budget, { productionId });

  const loading = board === undefined || budget === undefined || items === undefined;

  const errands = board ?? [];
  const confirmed = errands.filter((e) => e.status === "confirmed").length;
  const waiting = errands.filter((e) => ["waiting", "sent"].includes(e.status)).length;
  const replied = errands.filter((e) => ["replied", "negotiating"].includes(e.status)).length;
  const cured = (items ?? []).filter((i) => i.status === "cured").length;
  const totalGaps = items?.length ?? 0;

  // Activity: most recent inbound/outbound message across all errands.
  const activity = errands
    .filter((e) => e.lastMessage)
    .sort((a, b) => (b.lastMessage!.sentAt ?? 0) - (a.lastMessage!.sentAt ?? 0))
    .slice(0, 8);

  const currency = budget?.currency ?? "USD";
  const byKind: Record<string, number> = budget?.byKind ?? {};
  const maxKind = Math.max(1, ...Object.values(byKind));

  // Needs attention: replies and quotes waiting on a human decision, plus anything
  // whose follow-up is overdue. This is the "what do I do next" list.
  const now = Date.now();
  const attention = errands
    .map((e) => {
      if (e.status === "replied" || e.status === "negotiating") {
        return { e, why: "Awaiting your reply", tone: "sky" as const };
      }
      if ((e.status === "waiting" || e.status === "sent") && e.nextFollowupAt && e.nextFollowupAt < now) {
        return { e, why: "Follow-up overdue", tone: "amber" as const };
      }
      return null;
    })
    .filter((x): x is { e: (typeof errands)[number]; why: string; tone: "sky" | "amber" } => !!x)
    .slice(0, 6);

  return (
    <div className="p-6">
      <PageHeader
        title={production?.name ?? "Overview"}
        subtitle={production?.logline || "Production dashboard"}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("diagnosis")}>
              <Icon.Stethoscope className="h-4 w-4" /> Diagnose
            </Button>
            <Button size="sm" onClick={() => onNavigate("pipeline")}>
              <Icon.Board className="h-4 w-4" /> Pipeline
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Gaps diagnosed"
              value={totalGaps}
              hint={`${cured} cured`}
              icon={<Icon.Stethoscope />}
            />
            <Stat
              label="Awaiting reply"
              value={waiting}
              tone="amber"
              hint={`${replied} replied`}
              icon={<Icon.Mail />}
            />
            <Stat
              label="Confirmed"
              value={confirmed}
              tone="emerald"
              hint={`of ${errands.length} errands`}
              icon={<Icon.Check />}
            />
            <Stat
              label="Budget confirmed"
              value={`${currency} ${(budget?.accepted ?? 0).toLocaleString()}`}
              tone="emerald"
              hint={`${(budget?.proposed ?? 0).toLocaleString()} quoted`}
              icon={<Icon.Coin />}
            />
          </div>

          {/* Needs attention */}
          {attention.length > 0 && (
            <Card className="mt-6 p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Icon.Bolt className="h-4 w-4 text-amber-300" /> Needs your attention
                </h3>
                <span className="text-xs text-white/40">{attention.length} open</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {attention.map(({ e, why, tone }) => (
                  <li key={e._id}>
                    <button
                      onClick={() => onNavigate("pipeline")}
                      className="flex w-full items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-left hover:bg-white/[0.06]"
                    >
                      <span className="text-sm">{KIND_ICON[e.kind] ?? "•"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {e.contact?.name ?? "Contact"}
                          <span className="ml-2 font-normal text-white/40">{KIND_LABEL[e.kind] ?? e.kind}</span>
                        </p>
                        <p className="truncate text-[11px] text-white/45">{e.subject}</p>
                      </div>
                      <Badge tone={tone === "sky" ? "replied" : "waiting"}>{why}</Badge>
                      <Icon.Arrow className="h-3.5 w-3.5 text-white/30" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Pipeline funnel */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Outreach pipeline</h3>
                <button
                  onClick={() => onNavigate("pipeline")}
                  className="text-xs text-emerald-300 hover:text-emerald-200"
                >
                  Open board
                </button>
              </div>
              {errands.length === 0 ? (
                <Empty
                  icon={<Icon.Board className="h-8 w-8" />}
                  title="No outreach yet"
                  body="Diagnose the production, then cure a gap to send the first email."
                  action={
                    <Button size="sm" onClick={() => onNavigate("diagnosis")}>
                      Run diagnosis
                    </Button>
                  }
                />
              ) : (
                <div className="mt-4 space-y-3">
                  {FUNNEL.map((f) => {
                    const n = errands.filter((e) => f.statuses.includes(e.status)).length;
                    return (
                      <div key={f.key}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-white/60">{f.label}</span>
                          <span className="tabular-nums text-white/45">{n}</span>
                        </div>
                        <Progress value={n} max={errands.length} tone={f.tone} />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Budget by category */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold">Quoted by category</h3>
              {Object.keys(byKind).length === 0 ? (
                <p className="mt-4 text-sm text-white/40">
                  No quotes yet. As vendors reply with prices, they land here automatically.
                </p>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {Object.entries(byKind)
                    .sort((a, b) => b[1] - a[1])
                    .map(([kind, amount]) => (
                      <div key={kind} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-xs text-white/60">
                          {KIND_ICON[kind] ?? "•"} {KIND_LABEL[kind] ?? kind}
                        </span>
                        <div className="flex-1">
                          <Progress value={amount} max={maxKind} tone="emerald" />
                        </div>
                        <span className="w-20 shrink-0 text-right text-xs tabular-nums text-white/70">
                          {currency} {amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>

          {/* Activity feed */}
          <Card className="mt-6 p-5">
            <h3 className="text-sm font-semibold">Recent activity</h3>
            {activity.length === 0 ? (
              <p className="mt-4 text-sm text-white/40">
                No email activity yet. Sent and received messages will show up here as they happen.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06]">
                {activity.map((e) => {
                  const m = e.lastMessage!;
                  const inbound = m.direction === "inbound";
                  return (
                    <li key={e._id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
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
                          <Badge tone={e.status}>{STATUS_LABEL[e.status] ?? e.status}</Badge>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-white/45">{m.body}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-white/35">{ago(m.sentAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <p className="mt-6 text-center text-xs text-white/30">
            {contacts?.length ?? 0} contacts sourced &middot; live on Convex, updates the moment a
            reply lands.
          </p>
        </>
      )}
    </div>
  );
}
