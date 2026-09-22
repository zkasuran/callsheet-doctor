import { Badge, Button, Card, Icon, ThemeToggle, cx } from "./ui";

/* The public marketing site, shown to anyone not signed in. Real SaaS shape:
   hero + product preview, the capabilities, how it works, who it is for, a proof
   band, the sponsor stack doing real work, the Convex depth, and CTAs. */

function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300">
        <Icon.Rx className="h-5 w-5" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Callsheet Doctor</span>
    </span>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-emerald-300">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/50">{body}</p>
    </Card>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="relative pl-12">
      <span className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-sm font-semibold text-emerald-300">
        {n}
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-white/50">{body}</p>
    </div>
  );
}

export default function Landing({ onStart, onGuest }: { onStart: () => void; onGuest: () => void }) {
  return (
    <div className="min-h-full">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0f14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3.5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-white/60 md:flex">
            <a href="#how" className="hover:text-white/90">How it works</a>
            <a href="#stack" className="hover:text-white/90">The stack</a>
            <a href="#who" className="hover:text-white/90">Who it's for</a>
            <a href="#modules" className="hover:text-white/90">Modules</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={onStart} className="hidden text-sm text-white/70 hover:text-white/90 sm:block">
              Sign in
            </button>
            <Button size="sm" onClick={onGuest}>
              Try it free
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60rem 40rem at 72% -12%, rgba(16,185,129,0.16), transparent 60%), radial-gradient(42rem 32rem at 8% 8%, rgba(56,189,248,0.10), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
          <Badge tone="confirmed" className="mx-auto">
            <Icon.Sparkles className="h-3 w-3" /> Built on Convex for the All Gas Hackathon
          </Badge>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Your film's pre-production,
            <span className="text-emerald-300"> diagnosed and cured</span> over email.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/55">
            Paste a script, or just describe the film. Callsheet Doctor reads it, lists every
            location, cast, crew, gear and permit gap, sources real vendors, and runs the outreach
            from your own inbox, so the whole shoot lines up while you sleep.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={onGuest}>
              Try it as a guest <Icon.Arrow className="h-4 w-4" />
            </Button>
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm text-white/80 hover:bg-white/5"
            >
              Sign in or sign up
            </button>
          </div>
          <p className="mt-3 text-xs text-white/40">
            No account needed. Guest mode opens a workspace preloaded with ten diagnosed
            productions so you can see exactly what it does.
          </p>

          {/* Product preview */}
          <div className="mx-auto mt-14 max-w-4xl">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-1.5 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
                <span className="ml-2 text-[11px] text-white/30">confident-mule-621.convex.site</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0b0f14] p-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { l: "Gaps found", v: "23", t: "text-white" },
                    { l: "Outreach sent", v: "18", t: "text-sky-300" },
                    { l: "Confirmed", v: "11", t: "text-emerald-300" },
                    { l: "Budget quoted", v: "$47k", t: "text-amber-300" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left">
                      <p className="text-[11px] uppercase tracking-wide text-white/40">{s.l}</p>
                      <p className={cx("mt-1 text-2xl font-semibold tabular-nums", s.t)}>{s.v}</p>
                    </div>
                  ))}
                </div>
                {/* mini pipeline strip */}
                <div className="mt-3 grid grid-cols-6 gap-2 text-left">
                  {[
                    { k: "Drafting", n: 2, c: "text-white/50" },
                    { k: "Waiting", n: 5, c: "text-amber-300" },
                    { k: "Replied", n: 4, c: "text-sky-300" },
                    { k: "Negotiating", n: 3, c: "text-violet-300" },
                    { k: "Confirmed", n: 8, c: "text-emerald-300" },
                    { k: "Closed", n: 1, c: "text-white/40" },
                  ].map((col) => (
                    <div key={col.k} className="rounded-lg border border-white/8 bg-white/[0.02] p-2">
                      <p className="truncate text-[10px] text-white/40">{col.k}</p>
                      <p className={cx("text-sm font-semibold tabular-nums", col.c)}>{col.n}</p>
                      <div className="mt-1.5 space-y-1">
                        {Array.from({ length: Math.min(col.n, 3) }).map((_, i) => (
                          <div key={i} className="h-1.5 rounded-full bg-white/10" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two ways to start */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            icon={<Icon.Stethoscope className="h-5 w-5" />}
            title="Reads the script like a line producer"
            body="Paste a screenplay, or describe the film in a sentence and let it write a shootable treatment first. Either way you get every concrete need, categorised, in seconds."
          />
          <Feature
            icon={<Icon.Search className="h-5 w-5" />}
            title="Sources real vendors, not guesses"
            body="For each gap it crawls the open web for the right venue, rental house or crew, then pulls a real contact email off the page."
          />
          <Feature
            icon={<Icon.Mail className="h-5 w-5" />}
            title="Runs the outreach for you"
            body="It writes and sends the first email from your production's own inbox, reads the replies, negotiates a quote, and chases anyone who goes quiet."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">From script to a locked shoot</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            One workspace per production. Everything updates live on Convex as emails go out and
            replies land, so the whole team watches the shoot come together in real time.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Step n={1} title="Diagnose" body="Paste a script or describe the film. It writes a treatment if you need one, then lists every production gap." />
            <Step n={2} title="Source contacts" body="For any gap, it crawls the web and pulls real vendor and venue emails into your contact book." />
            <Step n={3} title="Send outreach" body="It drafts a warm, specific email from your inbox and sends it, then sets the errand waiting." />
            <Step n={4} title="Watch it close" body="Replies flow back in, quotes fill the budget, and the pipeline moves to confirmed on its own." />
          </div>
        </div>
      </section>

      {/* Proof band */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center md:grid-cols-4">
          {[
            { v: "12", l: "production modules" },
            { v: "10", l: "gaps from one scene" },
            { v: "4", l: "services, real work each" },
            { v: "<3 min", l: "script to sent outreach" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-3xl font-semibold tracking-tight text-emerald-300">{s.v}</p>
              <p className="mt-1 text-xs text-white/45">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section id="who" className="border-y border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Made for the people who chase the shoot</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            The breakdown and the outreach are the same grind whatever you are making.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Indie producers", b: "Lock a whole shoot without a coordinator on payroll." },
              { t: "Line producers", b: "Skip the spreadsheet week; start with a full breakdown." },
              { t: "Student films", b: "Punch above budget by sourcing and emailing at scale." },
              { t: "Commercial shoots", b: "Turn a brief into vendors and quotes in an afternoon." },
            ].map((w) => (
              <Card key={w.t} className="p-5">
                <h3 className="text-sm font-semibold">{w.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/50">{w.b}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsor stack */}
      <section id="stack" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Every part earns its place</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          This is not a wrapper. Each service does real work in the hot path, verified live on the
          deployment.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { n: "Convex", c: "text-emerald-300", b: "The whole backend. Schema, queries, mutations, actions, HTTP webhooks, cron sweeps and the live subscriptions that update the dashboard the instant a reply arrives." },
            { n: "OpenAI", c: "text-sky-300", b: "Writes a script from a brief, breaks it into needs, drafts every outreach email, reads inbound replies, decides the outcome and extracts the quote." },
            { n: "Firecrawl", c: "text-amber-300", b: "Searches the open web for the right vendor for each gap and scrapes each hit for a real contact email with a JSON schema." },
            { n: "AgentMail", c: "text-violet-300", b: "Gives each production its own real inbox, sends the outreach, threads the replies, and webhooks every inbound message straight back into Convex." },
          ].map((s) => (
            <Card key={s.n} className="p-5">
              <p className={cx("text-xs font-semibold uppercase tracking-wide", s.c)}>{s.n}</p>
              <p className="mt-2 text-sm text-white/60">{s.b}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Under the hood (Convex depth) */}
      <section className="border-t border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Real-time, all the way down</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            The board is not polled. Convex live queries push every change the moment it lands, and
            the agent runs on the backend, not the browser.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Live subscriptions", b: "The pipeline, budget and inbox update the instant an email sends or a reply arrives." },
              { t: "Webhooks + crons", b: "Inbound mail hits an HTTP action; a cron sweeps waiting errands and nudges the quiet ones." },
              { t: "One engine, twelve modules", b: "A single errands table discriminated by kind keeps the agent and queries uniform." },
              { t: "Auth that fits", b: "Email/password, one-click guest, and guest-to-account upgrade that keeps your work." },
              { t: "Reset without email", b: "Forgot your password? Prove a TOTP code or a passkey, both built in the Convex runtime." },
              { t: "Light and dark", b: "A theme you can switch, remembered per browser, honoring your system setting." },
            ].map((f) => (
              <div key={f.t} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-2">
                  <Icon.Check className="h-4 w-4 text-emerald-300" />
                  <h3 className="text-sm font-semibold">{f.t}</h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-white/50">{f.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Twelve modules, one engine</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Every kind of gap runs through the same outreach engine, so the coverage is wide without
          the app getting heavier.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {[
            "📍 Locations", "🎭 Cast", "🎬 Crew", "🎥 Gear", "📄 Permits", "🍽️ Catering",
            "⚖️ Clearance", "🛡️ Insurance", "✈️ Travel", "🏆 Festivals", "📰 Press", "📡 Distribution",
          ].map((m) => (
            <span key={m} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white/70">
              {m}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Line up your next shoot tonight</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
            Open it as a guest, describe your film, and watch the doctor start the calls. No signup,
            nothing to install.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={onGuest}>
              Try it as a guest <Icon.Arrow className="h-4 w-4" />
            </Button>
            <a
              href="https://github.com/zkasuran/callsheet-doctor"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm text-white/80 hover:bg-white/5"
            >
              <Icon.Globe className="h-4 w-4" /> View the code
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-white/40 sm:flex-row">
          <Logo />
          <p>Built on Convex, OpenAI, Firecrawl and AgentMail for the Convex All Gas Hackathon.</p>
        </div>
      </footer>
    </div>
  );
}
