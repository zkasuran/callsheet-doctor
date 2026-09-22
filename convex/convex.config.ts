import { defineApp } from "convex/server";

// Kept minimal on purpose. The LLM (gpt-oss via GMI), Firecrawl and AgentMail are all called
// over plain REST from actions, and Svix webhook signatures are verified inline with Web Crypto,
// so the dev deployment runs before any key is set and there is no "use node" or component
// packaging risk in the hot path. The one component we add is @convex-dev/static-hosting, wired
// in at the deploy step so it serves the built SPA at https://<deployment>.convex.site.
const app = defineApp();

export default app;
