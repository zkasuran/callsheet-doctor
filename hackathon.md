# Hackathon log

- **Project:** Callsheet Doctor
- **Event:** Convex All Gas Hackathon
- **What it does:** An AI production coordinator for filmmakers. It reads a script, diagnoses every pre-production gap (locations, cast, crew, gear, permits and more), sources real vendors off the open web, then cures each gap by running real email outreach from the production's own inbox, tracking it all on a live dashboard.
- **Live app:** https://confident-mule-621.convex.site
- **Demo video:** https://youtu.be/uIq5ZO7AevY
- **Social post:** https://x.com/zkasuran/status/2102440896159772940
- **Repo:** https://github.com/zkasuran/callsheet-doctor
- **Frontend:** Convex static hosting (`@convex-dev/static-hosting`), a React + Vite SPA served at the `.convex.site` URL above.
- **Convex deployment:** prod `confident-mule-621` (team asuran, project callsheet)
- **Components:** `@convex-dev/static-hosting`
- **Convex features:** queries, mutations, actions, http actions, crons, scheduler, real-time subscriptions, auth
- **Auth:** Convex Auth. Email + password for real accounts, plus one-click Anonymous guest access so anyone can try the app instantly. A guest can upgrade to a real account in place by adding an email and password, which links to their existing user so all their productions, contacts and worked errands carry over (no data loss, no duplicate account). Every production and errand is scoped to the signed-in user, guest or not. Password reset is gated on a second factor the user enrolled (TOTP authenticator or passkey), since there is no email reset.
- **AI models:** OpenAI GPT (gpt-5.6-sol) over an OpenAI-compatible endpoint, with an automatic fallback to a second OpenAI-compatible provider if the primary is unavailable.
- **Started:** 2026-09-22
- **Last updated:** 2026-09-22

## Try it (for judges)

1. Open https://confident-mule-621.convex.site
2. Fastest path: click **Try it as a guest**. No account needed. It opens a workspace
   preloaded with **ten fully diagnosed productions** (Midnight Run, The Long Table, Signal
   Lost, Paper Planes, Neon Alley, The Bakehouse, Cold Open, Tidewater, Understudy, Dust
   Bowl) so you can immediately see what the product does. A banner offers to create an
   account to keep the work.
3. Or sign in with the ready demo account, or create your own:
   - **Email:** `judge@callsheet.demo`
   - **Password:** `CallsheetDemo1`
   - This account has an authenticator (TOTP) already enrolled for the password-reset demo.
3. Things to try:
   - **Guided tour:** it runs automatically the first time you sign in and walks through the whole
     workflow. Replay it any time from the "Tour" button in the top bar.
   - **Diagnosis:** paste a script (or hit "Use sample") and run the diagnosis. OpenAI reads it
     like a line producer and breaks it into categorised production needs in a few seconds.
   - **Contacts / Firecrawl:** open a gap, search, and watch real vendor emails get scraped in.
   - **Inbox / AgentMail:** the workspace has a live `@agentmail.to` inbox; sending outreach
     emails a real vendor and threads the reply back into the pipeline.
   - **Security + password reset:** the demo account has an authenticator (TOTP) enrolled.
     Sign out, click "Forgot password?", enter the email, choose "Use my authenticator code",
     enter a current 6-digit code, and set a new password. You can also enroll a passkey
     under Security and reset with that instead.

## End-to-end verification (run on prod 2026-09-22)

Each integration was exercised against the live prod deployment:

- **Convex:** sign-up/sign-in return real JWTs; authenticated queries and mutations
  (create production, add script, create errand) succeed; the SPA is live at the
  `.convex.site` URL with the auth OpenID + JWKS endpoints serving.
- **Firecrawl:** `contacts:find` searched the web and inserted two real vendor contacts
  with genuine emails and the source URLs it scraped them from.
- **AgentMail:** `provisionInbox` created a live inbox `callsheet-midnight-run-demo-…@agentmail.to`;
  a send returned a real `message_id` (via SES) and `thread_id`.
- **OpenAI:** live and verified. The diagnosis reads a script and returns a correct, categorised breakdown (e.g. a diner-heist scene yielded 10 needs across locations, cast, gear, a stunt coordinator, a permit and catering), and the agent drafts contextual email replies. Served via an OpenAI-compatible endpoint with an automatic fallback provider.
- **Password reset via 2FA:** enrolled TOTP, confirmed it, then ran the full reset: discover
  factor, verify a live code, receive a single-use token, set a new password. Signing in with
  the new password succeeded and the old password was rejected. TOTP math checks against the
  RFC 6238 test vectors.



Callsheet Doctor is built as a real SaaS product, not a demo screen.

- **Marketing site** for signed-out visitors: hero, the problem it solves, a four-step "how it works", the sponsor stack, the twelve modules, and a call to action.
- **Authenticated app shell**: a left sidebar (Overview, Diagnosis, Pipeline, Contacts, Inbox), a top bar with a production switcher and the live inbox status, and a first-run flow for a brand new account.
- **Overview dashboard**: KPI stat cards (gaps diagnosed, awaiting reply, confirmed, budget confirmed), a live outreach funnel, a quoted-by-category breakdown, and a recent-activity feed. Everything is a Convex `useQuery`, so it updates the instant an email is sent or a reply lands.
- **Diagnosis**: paste a script, or describe the film in a plain-language brief and let OpenAI write a shootable treatment first, then run the AI breakdown and source contacts and fire outreach per gap.
- **Pipeline**: a six-column kanban of every errand. Click a card for the cockpit drawer: read the full email thread, send a real in-thread reply (with a Draft with AI helper), move the status by hand (Confirm, Negotiating, Decline, Close), and accept or reject each quote. Accepting a quote confirms the errand and feeds the budget.
- **Overview** also surfaces a "Needs your attention" list (replies awaiting you, follow-ups overdue) that jumps straight into the pipeline.
- **Contacts** and **Inbox** pages round out the workspace. From Contacts you can start an outreach errand for any vendor in one step, and the top-bar settings let you rename or archive a production.

## Architecture

- The data model is one `errands` table discriminated by a `kind` union (location, cast, crew, gear, permit, catering, clearance, insurance, travel, festival, press, distribution), plus productions, scripts, breakdownItems, contacts, messages, quotes and an emailEvents dedupe log. This is the "one engine, many modules" shape: a module is a filter on `kind`, not a separate table. See `convex/schema.ts`.
- Sponsor stack, each doing real work from Convex actions:
  - **OpenAI**: `convex/breakdown.ts` reads the script and extracts the production's needs; `convex/agent.ts` drafts outreach emails, reads inbound replies and decides the outcome. All via gpt-oss-120b over an OpenAI-compatible endpoint (`convex/lib/llm.ts`).
  - **Firecrawl**: `convex/contacts.ts` searches the web for the right vendor or venue and scrapes each hit for a real contact email (`convex/lib/firecrawl.ts`, v2 scrape with a JSON schema).
  - **AgentMail**: `convex/lib/agentmail.ts` creates the production's inbox, sends outreach, and replies within a thread; inbound replies arrive at an http action webhook (`convex/http.ts`) verified inline with Web Crypto (`convex/lib/svix.ts`).
- **Real-time**: the React dashboard subscribes with `useQuery`, so the pipeline and the budget update the moment an email is sent or a reply lands.
- **Autonomy**: `convex/crons.ts` sweeps waiting errands every 6 hours and `convex/followups.ts` sends a nudge, giving up politely after three tries.
- **Auth** (`convex/auth.ts`) scopes every production and errand to the signed-in user.
- **Second factors and reset** (`convex/mfa.ts`, `convex/reset.ts`, `convex/lib/totp.ts`, `convex/lib/webauthn.ts`): TOTP (RFC 6238, HMAC-SHA1 over Web Crypto) and passkeys (WebAuthn, with CBOR/COSE parsing and ES256/RS256 signature verification), all in the default Convex runtime. A forgotten password is reset only by verifying an enrolled factor, which mints a single-use token that authorises `modifyAccountCredentials`.

## Log

### 2026-09-22 - 2FA/passkey password reset + full E2E on prod

- Added a password reset gated on a second factor, since there is no email reset. Enroll a TOTP
  authenticator or a passkey under Security; verifying it on the sign-in screen unlocks setting a new
  password. New schema tables `mfa` and `resetChallenges`; TOTP and WebAuthn implemented from scratch
  for the default runtime.
- Made the model client resilient: retry on 429/5xx and fall back to a second OpenAI-compatible provider.
- Fixed the AgentMail inbox display name, which had rejected characters.
- Ran the whole product end to end on the live prod deployment and confirmed each integration (see the
  End-to-end verification section above). Seeded a demo account for judges.
- Typecheck and build stay green.



### 2026-09-22 - v2 frontend + live deploy

- Rebuilt the frontend from a single dashboard into a full SaaS product: a marketing landing page, a sidebar app shell with a production switcher, and five pages (Overview, Diagnosis, Pipeline, Contacts, Inbox), all on a shared design system in `src/ui.tsx` (buttons, cards, badges, stat cards, progress bars, skeletons, empty states, avatars and an inline icon set).
- The Pipeline detail drawer surfaces the full email thread with the `errands.messagesFor` query.
- Typecheck (`tsc --noEmit`) and the production build both pass clean.
- Deployed the Convex backend and the static frontend to the prod deployment `confident-mule-621`; the app is live at https://confident-mule-621.convex.site.

### 2026-09-22 - engine

- Built the schema, the sponsor integrations and the first working dashboard.
