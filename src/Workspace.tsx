import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Badge, Button, Card, Icon, Spinner, ThemeToggle, cx } from "./ui";
import Overview from "./pages/Overview";
import Diagnosis from "./pages/Diagnosis";
import Pipeline from "./pages/Pipeline";
import Contacts from "./pages/Contacts";
import InboxPage from "./pages/Inbox";
import Security from "./pages/Security";
import Tour, { type TourStep } from "./Tour";
import UpgradeAccount from "./UpgradeAccount";

type Page = "overview" | "diagnosis" | "pipeline" | "contacts" | "inbox" | "security";

const NAV: { key: Page; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <Icon.Dashboard /> },
  { key: "diagnosis", label: "Diagnosis", icon: <Icon.Stethoscope /> },
  { key: "pipeline", label: "Pipeline", icon: <Icon.Board /> },
  { key: "contacts", label: "Contacts", icon: <Icon.Contacts /> },
  { key: "inbox", label: "Inbox", icon: <Icon.Inbox /> },
  { key: "security", label: "Security", icon: <Icon.Bolt /> },
];

const TOUR_STEPS: TourStep[] = [
  {
    target: "",
    title: "Welcome to Callsheet Doctor",
    body: "This 60-second tour shows how to take a script from a pile of gaps to a locked shoot. Use Next, or arrow keys.",
  },
  {
    target: "production-switcher",
    title: "Pick a production",
    body: "Each film is its own workspace with its script, contacts, outreach and budget. Switch between them or start a new one here.",
    page: "overview",
  },
  {
    target: "nav-diagnosis",
    title: "1. Diagnose the script",
    body: "Paste a screenplay or treatment. The AI reads it like a line producer and lists every location, cast, crew, gear and permit gap.",
    page: "diagnosis",
  },
  {
    target: "diagnosis-intake",
    title: "Paste and run",
    body: "Drop in the script (or hit Use sample) and run the diagnosis. Each gap becomes a card you can cure.",
    page: "diagnosis",
  },
  {
    target: "nav-contacts",
    title: "2. Source real vendors",
    body: "On any gap, search and Firecrawl crawls the web for the right venue or rental house and pulls a real contact email. They collect here.",
    page: "contacts",
  },
  {
    target: "nav-inbox",
    title: "3. Send from your own inbox",
    body: "Each production gets a real inbox. The doctor drafts and sends the outreach, then threads every reply back in.",
    page: "inbox",
  },
  {
    target: "nav-pipeline",
    title: "4. Watch it close",
    body: "The pipeline moves on its own as replies land. Click any card to read the full email thread. Quotes fill the budget automatically.",
    page: "pipeline",
  },
  {
    target: "nav-security",
    title: "Secure your account",
    body: "There is no email password reset. Enroll an authenticator or a passkey here, and that factor is how you reset a forgotten password.",
    page: "security",
  },
  {
    target: "tour-button",
    title: "That's the tour",
    body: "You can replay it any time from here. Now paste a script and let the doctor start the calls.",
    page: "overview",
  },
];

export default function Workspace() {
  const { signOut } = useAuthActions();
  const productions = useQuery(api.productions.list);
  const me = useQuery(api.users.me);
  const createProduction = useMutation(api.productions.create);
  const seedIfEmpty = useMutation(api.seed.seedIfEmpty);
  const seededRef = useRef(false);
  const [seeding, setSeeding] = useState(false);

  const [selected, setSelected] = useState<Id<"productions"> | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const [tourOpen, setTourOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const active = selected ?? productions?.[0]?._id ?? null;
  const production = useQuery(api.productions.get, active ? { productionId: active } : "skip");

  // First time a signed-in user has no productions, preload a few sample ones so the
  // dashboard, pipeline and inbox are populated instead of empty. Guarded by a ref and
  // by the query itself (seedIfEmpty is a no-op when productions already exist).
  useEffect(() => {
    if (productions !== undefined && productions.length === 0 && !seededRef.current) {
      seededRef.current = true;
      setSeeding(true);
      seedIfEmpty({}).finally(() => setSeeding(false));
    }
  }, [productions, seedIfEmpty]);

  // Auto-run the tour once per browser, the first time the app loads for a signed-in user.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("callsheet.tourSeen")) {
      const t = setTimeout(() => setTourOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function closeTour() {
    setTourOpen(false);
    try {
      localStorage.setItem("callsheet.tourSeen", "1");
    } catch {
      /* ignore storage errors (private mode) */
    }
  }

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
              data-tour={`nav-${n.key}`}
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
          <div data-tour="production-switcher">
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
          </div>
          {production && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg border border-white/15 p-1.5 text-white/50 hover:bg-white/5 hover:text-white/80"
              title="Production settings"
              aria-label="Production settings"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
          <div className="flex-1" />
          {production?.inboxAddress ? (
            <Badge tone="confirmed">
              <Icon.Mail className="h-3 w-3" /> {production.inboxAddress}
            </Badge>
          ) : production ? (
            <Badge tone="waiting">Inbox not provisioned</Badge>
          ) : null}
          <button
            data-tour="tour-button"
            onClick={() => setTourOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5 hover:text-white/90"
            title="Take the product tour"
          >
            <Icon.Sparkles className="h-3.5 w-3.5" /> Tour
          </button>
          <ThemeToggle />
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

        {/* Guest banner */}
        {me?.isGuest && (
          <div className="flex flex-wrap items-center gap-3 border-b border-emerald-400/20 bg-emerald-500/[0.07] px-5 py-2.5 text-sm">
            <Icon.Sparkles className="h-4 w-4 text-emerald-300" />
            <span className="text-white/70">
              You're exploring as a guest. This workspace is preloaded so you can see how it works.
            </span>
            <span className="flex-1" />
            <button
              onClick={() => setUpgradeOpen(true)}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-400"
            >
              Create an account to save your work
            </button>
          </div>
        )}

        {/* Page body */}
        <main className="flex-1 overflow-y-auto">
          {productions === undefined ? (
            <div className="grid h-full place-items-center text-white/40">
              <Spinner className="h-6 w-6" />
            </div>
          ) : seeding && productions.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center">
              <div>
                <Spinner className="mx-auto h-6 w-6" />
                <p className="mt-4 text-sm font-medium text-white/70">Setting up your workspace</p>
                <p className="mt-1 text-xs text-white/40">
                  Loading a few sample productions so you can look around.
                </p>
              </div>
            </div>
          ) : page === "security" ? (
            <Security />
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

      {tourOpen && (
        <Tour
          steps={TOUR_STEPS}
          onStep={(p) => {
            if (p) setPage(p);
          }}
          onClose={closeTour}
        />
      )}

      {settingsOpen && active && production && (
        <ProductionSettings
          productionId={active}
          name={production.name}
          logline={production.logline}
          archived={production.status === "archived"}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {upgradeOpen && <UpgradeAccount onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}

/* ---------- Production settings (rename / archive) ---------- */

function ProductionSettings({
  productionId,
  name,
  logline,
  archived,
  onClose,
}: {
  productionId: Id<"productions">;
  name: string;
  logline?: string;
  archived: boolean;
  onClose: () => void;
}) {
  const rename = useMutation(api.productions.rename);
  const setArchived = useMutation(api.productions.setArchived);
  const [n, setN] = useState(name);
  const [l, setL] = useState(logline ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <Card className="relative w-full max-w-md p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Production settings</h3>
          <button onClick={onClose} className="rounded p-1 text-white/50 hover:text-white/80" aria-label="Close">
            <Icon.Close className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-white/45">Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
              value={n}
              onChange={(e) => setN(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-white/45">Logline</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
              value={l}
              onChange={(e) => setL(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={busy === "save" || !n.trim()}
            onClick={async () => {
              setBusy("save");
              setSaved(false);
              try {
                await rename({ productionId, name: n, logline: l || undefined });
                setSaved(true);
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "save" ? <Spinner /> : saved ? "Saved" : "Save changes"}
          </Button>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <Button
            variant={archived ? "ghost" : "danger"}
            className="w-full"
            disabled={busy === "archive"}
            onClick={async () => {
              setBusy("archive");
              try {
                await setArchived({ productionId, archived: !archived });
                onClose();
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "archive" ? <Spinner /> : archived ? "Restore production" : "Archive production"}
          </Button>
          <p className="mt-2 text-center text-[11px] text-white/35">
            Archiving hides it from the active list. Nothing is deleted.
          </p>
        </div>
      </Card>
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
