# Hackathon log

- **Project:** Callsheet Doctor
- **Event:** Convex All Gas Hackathon
- **What it does:** An AI production coordinator for filmmakers. It reads a script, diagnoses every pre-production gap (locations, cast, crew, gear, permits and more), sources real vendors off the open web, then cures each gap by running real email outreach from the production's own inbox, tracking it all on a live dashboard.
- **Live app:** https://confident-mule-621.convex.site
- **Repo:** https://github.com/zkasuran/callsheet-doctor
- **Frontend:** Convex static hosting (`@convex-dev/static-hosting`), a React + Vite SPA served at the `.convex.site` URL above.
- **Convex deployment:** prod `confident-mule-621` (team asuran, project callsheet)
- **Components:** `@convex-dev/static-hosting`
- **Convex features:** queries, mutations, actions, http actions, crons, scheduler, real-time subscriptions, auth
- **Auth:** Convex Auth (email + password); every production and errand is scoped to the signed-in user.
- **AI models:** gpt-oss-120b (OpenAI's open-weight model, Apache-2.0) served over an OpenAI-compatible endpoint.
- **Started:** 2026-09-22
- **Last updated:** 2026-09-22

## The product

Callsheet Doctor is built as a real SaaS product, not a demo screen.

- **Marketing site** for signed-out visitors: hero, the problem it solves, a four-step "how it works", the sponsor stack, the twelve modules, and a call to action.
- **Authenticated app shell**: a left sidebar (Overview, Diagnosis, Pipeline, Contacts, Inbox), a top bar with a production switcher and the live inbox status, and a first-run flow for a brand new account.
- **Overview dashboard**: KPI stat cards (gaps diagnosed, awaiting reply, confirmed, budget confirmed), a live outreach funnel, a quoted-by-category breakdown, and a recent-activity feed. Everything is a Convex `useQuery`, so it updates the instant an email is sent or a reply lands.
- **Diagnosis**: paste a script, run the AI breakdown, then source contacts and fire outreach per gap.
- **Pipeline**: a six-column kanban of every errand, with a detail drawer that shows the full email thread as a chat.
- **Contacts** and **Inbox** pages round out the workspace.

## Architecture

- The data model is one `errands` table discriminated by a `kind` union (location, cast, crew, gear, permit, catering, clearance, insurance, travel, festival, press, distribution), plus productions, scripts, breakdownItems, contacts, messages, quotes and an emailEvents dedupe log. This is the "one engine, many modules" shape: a module is a filter on `kind`, not a separate table. See `convex/schema.ts`.
- Sponsor stack, each doing real work from Convex actions:
  - **OpenAI**: `convex/breakdown.ts` reads the script and extracts the production's needs; `convex/agent.ts` drafts outreach emails, reads inbound replies and decides the outcome. All via gpt-oss-120b over an OpenAI-compatible endpoint (`convex/lib/llm.ts`).
  - **Firecrawl**: `convex/contacts.ts` searches the web for the right vendor or venue and scrapes each hit for a real contact email (`convex/lib/firecrawl.ts`, v2 scrape with a JSON schema).
  - **AgentMail**: `convex/lib/agentmail.ts` creates the production's inbox, sends outreach, and replies within a thread; inbound replies arrive at an http action webhook (`convex/http.ts`) verified inline with Web Crypto (`convex/lib/svix.ts`).
- **Real-time**: the React dashboard subscribes with `useQuery`, so the pipeline and the budget update the moment an email is sent or a reply lands.
- **Autonomy**: `convex/crons.ts` sweeps waiting errands every 6 hours and `convex/followups.ts` sends a nudge, giving up politely after three tries.
- **Auth** (`convex/auth.ts`) scopes every production and errand to the signed-in user.

## Log

### 2026-09-22 - v2 frontend + live deploy

- Rebuilt the frontend from a single dashboard into a full SaaS product: a marketing landing page, a sidebar app shell with a production switcher, and five pages (Overview, Diagnosis, Pipeline, Contacts, Inbox), all on a shared design system in `src/ui.tsx` (buttons, cards, badges, stat cards, progress bars, skeletons, empty states, avatars and an inline icon set).
- The Pipeline detail drawer surfaces the full email thread with the `errands.messagesFor` query.
- Typecheck (`tsc --noEmit`) and the production build both pass clean.
- Deployed the Convex backend and the static frontend to the prod deployment `confident-mule-621`; the app is live at https://confident-mule-621.convex.site.

### 2026-09-22 - engine

- Built the schema, the sponsor integrations and the first working dashboard.
