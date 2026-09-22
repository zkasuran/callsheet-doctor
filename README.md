# Callsheet Doctor

An AI production coordinator for filmmakers. Paste a script and Callsheet Doctor reads it like a
line producer, diagnoses every pre-production gap (locations, cast, crew, gear, permits and more),
sources real vendors off the open web, then cures each gap by running real email outreach from the
production's own inbox, all on a live dashboard.

Built for the **Convex All Gas Hackathon**.

- **Live app:** https://confident-mule-621.convex.site
- **Backend:** Convex (schema, queries, mutations, actions, HTTP webhooks, crons, scheduler, real-time subscriptions, auth)
- **Frontend:** React + Vite, served from Convex static hosting

## How it works

1. **Diagnose.** Paste the script. OpenAI extracts every concrete production need as a categorised,
   scene-referenced breakdown.
2. **Source.** For any gap, Firecrawl searches the web for the right vendor or venue and scrapes a
   real contact email off the page.
3. **Reach out.** The agent drafts a warm, specific email and sends it from the production's own
   AgentMail inbox.
4. **Close.** Replies flow back through a webhook into Convex; the agent reads each one, records the
   quote, negotiates or confirms, and the pipeline moves on its own. A cron nudges anyone who goes
   quiet and gives up politely after three tries.

## The stack, each doing real work

| Service   | Role in the hot path |
| --------- | -------------------- |
| Convex    | The entire backend: data, functions, HTTP webhooks, cron sweeps, and the live subscriptions the dashboard reads from. |
| OpenAI    | Breaks the script down, drafts every email, reads replies and decides the outcome. |
| Firecrawl | Searches the web per gap and scrapes real contact emails with a JSON schema. |
| AgentMail | Gives each production a real inbox, sends the outreach, threads the replies, webhooks inbound mail back into Convex. |

## Data model

One `errands` table discriminated by a `kind` union is the whole engine; a module (Locations, Cast,
Crew, ...) is a filter on `kind`, not a separate table. Around it sit `productions`, `scripts`,
`breakdownItems`, `contacts`, `messages`, `quotes` and an `emailEvents` dedupe log. See
`convex/schema.ts`.

## Frontend

- Marketing landing page for signed-out visitors.
- Authenticated app shell with a sidebar, a production switcher, and live inbox status.
- Pages: Overview (KPIs, funnel, quoted-by-category, activity feed), Diagnosis, Pipeline (kanban +
  email-thread drawer), Contacts, Inbox.
- Shared design system in `src/ui.tsx`.

## Develop

```bash
npm install
npm run dev        # convex dev + vite in parallel
npm run typecheck  # tsc --noEmit
npm run build      # vite build
npm run deploy     # build, deploy backend, push static files to Convex hosting
```

The Convex deployment needs these environment variables set (`npx convex env set`):
`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `FIRECRAWL_API_KEY`, `AGENTMAIL_API_KEY`, plus
the Convex Auth keys `JWT_PRIVATE_KEY` and `JWKS`.

## Licence

See [LICENSE](./LICENSE).
