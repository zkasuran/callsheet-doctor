import { defineApp } from "convex/server";
import staticHosting from "@convex-dev/static-hosting/convex.config";

// The LLM (gpt-oss via GMI), Firecrawl and AgentMail are called over plain REST from
// actions, and Svix webhook signatures are verified inline with Web Crypto, so there is
// no "use node" or component packaging risk in the hot path. Static hosting serves the
// built SPA at https://<deployment>.convex.site; it is registered at the root while the
// auth and webhook routes stay in front of it (see convex/http.ts).
const app = defineApp();
app.use(staticHosting);

export default app;
