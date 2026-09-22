# Submission packet — Callsheet Doctor

Deadline: **Sep 22, 12:00 PM PT**. Everything below is ready to paste or record.

- **Live app:** https://confident-mule-621.convex.site
- **Repo (public):** https://github.com/zkasuran/callsheet-doctor
- **Submit form:** https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit
- **Demo account:** `judge@callsheet.demo` / `CallsheetDemo1` (or one-click "Try it as a guest")

---

## 1. vibeapps.dev submission form (copy-paste)

**Project name:** Callsheet Doctor

**One-liner:** An AI production coordinator for filmmakers: paste a script, it diagnoses every pre-production gap, sources real vendors, and runs the email outreach from your own inbox, live.

**Description:**
Callsheet Doctor turns a screenplay into a lined-up shoot. Paste a script and OpenAI reads it like a line producer, breaking it into every concrete need across twelve modules (locations, cast, crew, gear, permits, catering, clearance, insurance, travel, festivals, press, distribution). For each gap, Firecrawl searches the open web and scrapes a real vendor's contact email. The agent then drafts and sends outreach from the production's own AgentMail inbox, reads the replies through a webhook, extracts the quote, and negotiates or confirms, while a cron nudges anyone who goes quiet. You watch it all on a live pipeline board and step in to reply, change status, or accept a quote whenever you want. Convex is the whole backend: schema, queries, mutations, actions, HTTP webhooks, cron, scheduler, real-time subscriptions, and auth (email/password, one-click guest, guest-to-account upgrade, and TOTP/passkey-gated password reset).

**Live URL:** https://confident-mule-621.convex.site

**GitHub:** https://github.com/zkasuran/callsheet-doctor

**Video:** (paste the link after upload — see section 3)

**How each sponsor is used:**
- Convex: entire backend and real-time layer (see convex/schema.ts, errands.ts, agent.ts, http.ts, crons.ts).
- OpenAI: script breakdown, email drafting, reply decisions, quote extraction (convex/breakdown.ts, agent.ts).
- Firecrawl: web search + scrape for real vendor contact emails (convex/contacts.ts, lib/firecrawl.ts).
- AgentMail: real inbox per production, send, threaded reply, inbound webhook (convex/lib/agentmail.ts, http.ts).

---

## 2. Social post (X and LinkedIn)

### X (under 280 chars)
Built Callsheet Doctor for the @convex All Gas Hackathon 🎬

Paste a film script → it diagnoses every production gap, @firecrawl finds real vendors, @OpenAI drafts the outreach, @agentmail sends it from your inbox. All live on Convex.

Try it: https://confident-mule-621.convex.site

### LinkedIn
I built Callsheet Doctor for the Convex All Gas Hackathon: an AI production coordinator for filmmakers.

Paste a script and it reads it like a line producer, then diagnoses every pre-production gap: locations, cast, crew, gear, permits and more. For each gap it sources a real vendor off the web, drafts a warm outreach email, and sends it from the production's own inbox, then reads the replies and tracks every deal on a live board.

The whole thing runs on Convex (real-time backend, auth, crons, webhooks), with OpenAI generating, Firecrawl crawling, and AgentMail sending. Each does real work in the hot path, not just sitting in the README.

Try it as a guest, no signup: https://confident-mule-621.convex.site
Code: https://github.com/zkasuran/callsheet-doctor

Thanks @Convex @OpenAI @Firecrawl @AgentMail for a great three weeks.
#buildinpublic #filmmaking #AI

> Tags per the hackathon rules: @convex @OpenAI @firecrawl @agentmail (X). On LinkedIn, @-mention the Convex, OpenAI, Firecrawl and AgentMail company pages. Post from zkasuran.

---

## 3. Demo video script (< 3 minutes, click through the real product)

Record the live app at https://confident-mule-621.convex.site. Talk less, click more.

**0:00-0:20 — Hook + landing**
"This is Callsheet Doctor. It takes a film script and lines up the entire shoot for you." Show the landing page, click **Try it as a guest**.

**0:20-0:45 — Populated dashboard**
Land in the workspace, already full of ten diagnosed productions. "Every production is a workspace." Show the Overview: KPI cards, the outreach funnel, quoted-by-category budget, and the Needs-attention list.

**0:45-1:15 — Diagnosis (OpenAI)**
Open **Diagnosis**, hit **Use sample** (or paste a scene), click **Run diagnosis**. "OpenAI reads it like a line producer." Watch the categorised gaps appear.

**1:15-1:40 — Sourcing (Firecrawl)**
On a gap, type a search and hit **Find**. "Firecrawl searches the web and scrapes a real contact email." A real vendor appears in Contacts with its source link.

**1:40-2:15 — Outreach + pipeline (AgentMail + real-time)**
Open **Pipeline**, click a card. Show the email thread. Type a reply, hit **Draft with AI**, then **Send**. "That's a real email from the production's inbox." Accept a quote and show the budget update live.

**2:15-2:45 — Auth depth**
Open **Security**: show authenticator/passkey. "No email reset, you reset by proving a second factor." Then the guest banner: "and a guest can upgrade to a real account keeping all their work."

**2:45-3:00 — Close**
"Convex runs all of it in real time. OpenAI, Firecrawl and AgentMail each do real work." End on the live URL.

Record with any screen recorder (macOS: Cmd+Shift+5; Linux: OBS/Kazam), keep it under 3:00, upload to YouTube (unlisted is fine) or Loom, paste the link into the form.
