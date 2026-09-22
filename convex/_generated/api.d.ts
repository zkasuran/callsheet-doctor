/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as auth from "../auth.js";
import type * as breakdown from "../breakdown.js";
import type * as contacts from "../contacts.js";
import type * as crons from "../crons.js";
import type * as errands from "../errands.js";
import type * as followups from "../followups.js";
import type * as http from "../http.js";
import type * as lib_agentmail from "../lib/agentmail.js";
import type * as lib_firecrawl from "../lib/firecrawl.js";
import type * as lib_llm from "../lib/llm.js";
import type * as lib_svix from "../lib/svix.js";
import type * as lib_totp from "../lib/totp.js";
import type * as lib_webauthn from "../lib/webauthn.js";
import type * as mfa from "../mfa.js";
import type * as productions from "../productions.js";
import type * as reset from "../reset.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  auth: typeof auth;
  breakdown: typeof breakdown;
  contacts: typeof contacts;
  crons: typeof crons;
  errands: typeof errands;
  followups: typeof followups;
  http: typeof http;
  "lib/agentmail": typeof lib_agentmail;
  "lib/firecrawl": typeof lib_firecrawl;
  "lib/llm": typeof lib_llm;
  "lib/svix": typeof lib_svix;
  "lib/totp": typeof lib_totp;
  "lib/webauthn": typeof lib_webauthn;
  mfa: typeof mfa;
  productions: typeof productions;
  reset: typeof reset;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
