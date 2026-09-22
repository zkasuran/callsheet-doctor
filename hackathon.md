# Hackathon log

- **Project:** Asura Callsheet Doctor
- **Event:** Convex All Gas Hackathon
- **What it does:** An AI production coordinator for filmmakers. It reads a script, diagnoses every pre-production gap (locations, cast, crew, gear, permits and more), then cures each one by running real email outreach from the production's own inbox, tracking it all on a live chart.
- **Live app:** pending deploy (will be https://<deployment>.convex.site)
- **Repo:** https://github.com/zkasuran/callsheet-doctor
- **Frontend:** Convex static hosting
- **Convex deployment:** pending
- **Components:** @convex-dev/static-hosting (added at deploy)
- **Convex features:** queries, mutations, actions, http actions, crons, scheduler, real-time subscriptions, auth
- **Auth:** Convex Auth
- **AI models:** gpt-oss-120b (OpenAI's open-weight model, Apache-2.0) served via an OpenAI-compatible endpoint
- **Started:** 2026-09-22
- **Last updated:** 2026-09-22

## Log

### 2026-09-22 - working tree

Built the engine and the app.

- The data model is one `errands` table discriminated by a `kind` union (location, cast, crew, gear, permit, catering, clearance, insurance, travel, festival, press, distribution), plus productions, scripts, breakdownItems, contacts, messages, quotes and an emailEvents dedupe log. This is the "one engine, many modules" shape: a module is a filter on `kind`, not a separate table. See `convex/schema.ts`.
- Sponsor stack, each doing real work from Convex actions:
  - OpenAI: `convex/breakdown.ts` reads the script and extracts the production's needs; `convex/agent.ts` drafts outreach emails, reads inbound replies and decides the outcome. All via gpt-oss-120b over an OpenAI-compatible endpoint (`convex/lib/llm.ts`).
  - Firecrawl: `convex/contacts.ts` searches the web for the right vendor or venue and scrapes each hit for a real contact email (`convex/lib/firecrawl.ts`, v2 scrape with a JSON schema).
  - AgentMail: `convex/lib/agentmail.ts` creates the production's inbox, sends outreach, and replies within a thread; inbound replies arrive at an http action webhook (`convex/http.ts`) verified inline with Web Crypto (`convex/lib/svix.ts`).
- Real-time: the React dashboard (`src/Dashboard.tsx`) subscribes with `useQuery`, so the production chart and the budget update the moment an email is sent or a reply lands.
- Autonomy: `convex/crons.ts` sweeps waiting errands every 6 hours and `convex/followups.ts` sends a nudge, giving up politely after three tries.
- Auth (`convex/auth.ts`) scopes every production and errand to the signed-in user.
