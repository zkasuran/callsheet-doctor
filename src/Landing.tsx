import { Badge, Button, Card, Icon, cx } from "./ui";

/* The public marketing site, shown to anyone not signed in. Real SaaS shape:
   hero, the problem, how it works, the sponsor stack doing real work, and a CTA. */

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

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
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

export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-full">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0f14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-white/60 md:flex">
            <a href="#how" className="hover:text-white/90">How it works</a>
            <a href="#stack" className="hover:text-white/90">The stack</a>
            <a href="#modules" className="hover:text-white/90">Modules</a>
          </nav>
          <Button size="sm" onClick={onStart}>
            Open the app
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60rem 40rem at 70% -10%, rgba(16,185,129,0.14), transparent 60%), radial-gradient(40rem 30rem at 10% 10%, rgba(56,189,248,0.10), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
          <Badge tone="confirmed" className="mx-auto">
            <Icon.Sparkles className="h-3 w-3" /> Built on Convex for the All Gas Hackathon
          </Badge>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Your film's pre-production,
            <span className="text-emerald-300"> diagnosed and cured</span> over email.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/55">
            Paste a script. Callsheet Doctor reads it, lists every location, cast, crew, gear and
            permit gap, then sources real vendors and runs the outreach from your own inbox, so the
            whole shoot lines up while you sleep.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={onStart}>
              Diagnose a production <Icon.Arrow className="h-4 w-4" />
            </Button>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm text-white/80 hover:bg-white/5"
            >
              See how it works
            </a>
          </div>

          {/* Product frame preview */}
          <div className="mx-auto mt-14 max-w-4xl">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-1.5 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
              </div>
              <div className="grid gap-3 rounded-xl border border-white/10 bg-[#0b0f14] p-4 sm:grid-cols-4">
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
            </div>
          </div>
        </div>
      </section>

      {/* Problem / value */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            icon={<Icon.Stethoscope className="h-5 w-5" />}
            title="Reads the script like a line producer"
            body="The AI breakdown finds every concrete thing a scene needs to shoot, categorised and scene-referenced, in seconds instead of a week of spreadsheets."
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
            <Step n={1} title="Paste the script" body="Drop in the screenplay or a treatment. The doctor reads it and diagnoses every production need." />
            <Step n={2} title="Source contacts" body="For any gap, it crawls the web and pulls real vendor and venue emails into your contact book." />
            <Step n={3} title="Send outreach" body="It drafts a warm, specific email from your inbox and sends it, then sets the errand waiting." />
            <Step n={4} title="Watch it close" body="Replies flow back in, quotes fill the budget, and the pipeline moves to confirmed on its own." />
          </div>
        </div>
      </section>

      {/* Sponsor stack */}
      <section id="stack" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Every part earns its place</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          This is not a wrapper. Each service does real work in the hot path of the product.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Convex</p>
            <p className="mt-2 text-sm text-white/60">
              The whole backend. Schema, queries, mutations, actions, HTTP webhooks, cron sweeps and
              the live subscriptions that make the dashboard update the instant a reply arrives.
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">OpenAI</p>
            <p className="mt-2 text-sm text-white/60">
              Breaks the script down into needs, drafts every outreach email, reads inbound replies
              and decides the outcome, then extracts the quote.
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Firecrawl</p>
            <p className="mt-2 text-sm text-white/60">
              Searches the open web for the right vendor for each gap and scrapes each hit for a real
              contact email with a JSON schema.
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">AgentMail</p>
            <p className="mt-2 text-sm text-white/60">
              Gives each production its own real inbox, sends the outreach, threads the replies, and
              webhooks every inbound message straight back into Convex.
            </p>
          </Card>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="border-t border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-6 py-16">
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
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Line up your next shoot tonight</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
          Create a workspace, paste a script, and let the doctor start the calls.
        </p>
        <div className="mt-7">
          <Button size="lg" onClick={onStart}>
            Get started free <Icon.Arrow className="h-4 w-4" />
          </Button>
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
