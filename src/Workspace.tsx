import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Badge, Button, Card, Icon, Spinner, cx } from "./ui";
import Overview from "./pages/Overview";
import Diagnosis from "./pages/Diagnosis";
import Pipeline from "./pages/Pipeline";
import Contacts from "./pages/Contacts";
import InboxPage from "./pages/Inbox";

type Page = "overview" | "diagnosis" | "pipeline" | "contacts" | "inbox";

const NAV: { key: Page; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <Icon.Dashboard /> },
  { key: "diagnosis", label: "Diagnosis", icon: <Icon.Stethoscope /> },
  { key: "pipeline", label: "Pipeline", icon: <Icon.Board /> },
  { key: "contacts", label: "Contacts", icon: <Icon.Contacts /> },
  { key: "inbox", label: "Inbox", icon: <Icon.Inbox /> },
];

export default function Workspace() {
  const { signOut } = useAuthActions();
  const productions = useQuery(api.productions.list);
  const createProduction = useMutation(api.productions.create);

  const [selected, setSelected] = useState<Id<"productions"> | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const active = selected ?? productions?.[0]?._id ?? null;
  const production = useQuery(api.productions.get, active ? { productionId: active } : "skip");

  return (
    <div className="flex min-h-full">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-white/[0.015] md:flex">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300">
            <Icon.Rx className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Callsheet Doctor</p>
            <p className="text-[11px] text-white/40">Production coordinator</p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-0.5 px-3">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setPage(n.key)}
              className={cx(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                page === n.key
                  ? "bg-emerald-500/12 text-emerald-200"
                  : "text-white/60 hover:bg-white/5 hover:text-white/85",
              )}
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-white/80"
          >
            <Icon.Arrow className="h-4 w-4 rotate-180" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#0b0f14]/85 px-5 py-3 backdrop-blur">
          <ProductionSwitcher
            productions={productions}
            active={active}
            onSelect={(id) => {
              setSelected(id);
              setPage("overview");
            }}
            onCreate={async (name, logline) => {
              const id = await createProduction({ name, logline: logline || undefined });
              setSelected(id);
              setPage("diagnosis");
            }}
          />
          <div className="flex-1" />
          {production?.inboxAddress ? (
            <Badge tone="confirmed">
              <Icon.Mail className="h-3 w-3" /> {production.inboxAddress}
            </Badge>
          ) : production ? (
            <Badge tone="waiting">Inbox not provisioned</Badge>
          ) : null}
          {/* Mobile nav */}
          <select
            value={page}
            onChange={(e) => setPage(e.target.value as Page)}
            className="rounded-lg border border-white/15 bg-transparent px-2 py-1.5 text-xs text-white/70 md:hidden"
          >
            {NAV.map((n) => (
              <option key={n.key} value={n.key} className="bg-[#0b0f14]">
                {n.label}
              </option>
            ))}
          </select>
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-y-auto">
          {productions === undefined ? (
            <div className="grid h-full place-items-center text-white/40">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !active ? (
            <FirstRun
              onCreate={async (name, logline) => {
                const id = await createProduction({ name, logline: logline || undefined });
                setSelected(id);
                setPage("diagnosis");
              }}
            />
          ) : page === "overview" ? (
            <Overview productionId={active} onNavigate={setPage} />
          ) : page === "diagnosis" ? (
            <Diagnosis productionId={active} />
          ) : page === "pipeline" ? (
            <Pipeline productionId={active} />
          ) : page === "contacts" ? (
            <Contacts productionId={active} />
          ) : (
            <InboxPage productionId={active} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- Production switcher (dropdown + create) ---------- */

function ProductionSwitcher({
  productions,
  active,
  onSelect,
  onCreate,
}: {
  productions: { _id: Id<"productions">; name: string }[] | undefined;
  active: Id<"productions"> | null;
  onSelect: (id: Id<"productions">) => void;
  onCreate: (name: string, logline: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [logline, setLogline] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = productions?.find((p) => p._id === active);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
      >
        <Icon.Film className="h-4 w-4 text-white/50" />
        <span className="max-w-[14rem] truncate font-medium">{current?.name ?? "Select production"}</span>
        <svg className="h-3.5 w-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-white/10 bg-[#0e141b] p-2 shadow-2xl shadow-black/50">
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {productions?.map((p) => (
              <button
                key={p._id}
                onClick={() => {
                  onSelect(p._id);
                  setOpen(false);
                }}
                className={cx(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                  p._id === active ? "bg-emerald-500/12 text-emerald-200" : "text-white/70 hover:bg-white/5",
                )}
              >
                <span className="truncate">{p.name}</span>
                {p._id === active && <Icon.Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>

          <div className="mt-2 border-t border-white/10 pt-2">
            {creating ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!name.trim()) return;
                  await onCreate(name, logline);
                  setName("");
                  setLogline("");
                  setCreating(false);
                  setOpen(false);
                }}
                className="space-y-2 p-1"
              >
                <input
                  autoFocus
                  className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400/60"
                  placeholder="Production name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400/60"
                  placeholder="Logline (optional)"
                  value={logline}
                  onChange={(e) => setLogline(e.target.value)}
                />
                <Button type="submit" size="sm" className="w-full">
                  Create workspace
                </Button>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5"
              >
                <Icon.Plus className="h-4 w-4" /> New production
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- First run (no productions yet) ---------- */

function FirstRun({ onCreate }: { onCreate: (name: string, logline: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [logline, setLogline] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid h-full place-items-center px-6">
      <Card className="w-full max-w-md p-7 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <Icon.Film className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Start your first production</h2>
        <p className="mt-1 text-sm text-white/45">
          A workspace holds one film's script, contacts, outreach and budget.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            setBusy(true);
            try {
              await onCreate(name, logline);
            } finally {
              setBusy(false);
            }
          }}
          className="mt-5 space-y-3 text-left"
        >
          <input
            className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
            placeholder="Production name (e.g. Midnight Run)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
            placeholder="Logline (optional)"
            value={logline}
            onChange={(e) => setLogline(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Spinner /> : "Create workspace"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
