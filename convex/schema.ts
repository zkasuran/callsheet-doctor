import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// The "one engine, many modules" shape: every outreach errand is a row in a single
// `errands` table discriminated by `kind`. A module (Locations, Cast, Crew, ...) is a
// filter on `kind`, not a separate table, so queries, crons and the agent stay uniform.
export const errandKind = v.union(
  v.literal("location"),
  v.literal("cast"),
  v.literal("crew"),
  v.literal("gear"),
  v.literal("permit"),
  v.literal("catering"),
  v.literal("clearance"), // music / footage rights
  v.literal("insurance"),
  v.literal("travel"),
  v.literal("festival"),
  v.literal("press"),
  v.literal("distribution"),
);

export const errandStatus = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("waiting"),
  v.literal("replied"),
  v.literal("negotiating"),
  v.literal("confirmed"),
  v.literal("declined"),
  v.literal("closed"),
);

export default defineSchema({
  ...authTables, // users, authSessions, authAccounts, ...

  productions: defineTable({
    name: v.string(),
    logline: v.optional(v.string()),
    ownerId: v.id("users"),
    inboxId: v.optional(v.string()), // AgentMail inbox this production emails from
    inboxAddress: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
  }).index("by_owner", ["ownerId"]),

  scripts: defineTable({
    productionId: v.id("productions"),
    title: v.string(),
    text: v.string(), // pasted or extracted script text
    uploadedBy: v.id("users"),
  }).index("by_production", ["productionId"]),

  // The diagnosis: what the film needs, extracted from the script by the LLM.
  breakdownItems: defineTable({
    productionId: v.id("productions"),
    category: errandKind,
    name: v.string(),
    detail: v.optional(v.string()),
    sceneRefs: v.optional(v.array(v.string())),
    status: v.union(v.literal("gap"), v.literal("sourcing"), v.literal("cured")),
  })
    .index("by_production", ["productionId"])
    .index("by_production_category", ["productionId", "category"]),

  contacts: defineTable({
    productionId: v.id("productions"),
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    sourceUrl: v.optional(v.string()), // where Firecrawl found them
  })
    .index("by_production", ["productionId"])
    .index("by_email", ["productionId", "email"]),

  // One outreach errand == one email thread with a status.
  errands: defineTable({
    productionId: v.id("productions"),
    breakdownItemId: v.optional(v.id("breakdownItems")),
    contactId: v.id("contacts"),
    kind: errandKind,
    subject: v.string(),
    goal: v.string(), // what "cured" means for this errand, drives the agent
    status: errandStatus,
    providerThreadId: v.optional(v.string()), // AgentMail thread id, to reply within
    lastOutboundAt: v.optional(v.number()),
    lastInboundAt: v.optional(v.number()),
    nextFollowupAt: v.optional(v.number()), // epoch ms, drives the cron sweep
    followupCount: v.number(),
  })
    .index("by_production", ["productionId"])
    .index("by_production_status", ["productionId", "status"])
    .index("by_status_followup", ["status", "nextFollowupAt"])
    .index("by_provider_thread", ["providerThreadId"]),

  messages: defineTable({
    errandId: v.id("errands"),
    productionId: v.id("productions"),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    from: v.string(),
    to: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    providerMessageId: v.optional(v.string()),
    providerThreadId: v.optional(v.string()),
    sentAt: v.number(),
  })
    .index("by_errand", ["errandId"])
    .index("by_provider_message", ["providerMessageId"]),

  // Real quotes parsed out of inbound replies. Feeds the live budget.
  quotes: defineTable({
    errandId: v.id("errands"),
    productionId: v.id("productions"),
    contactId: v.id("contacts"),
    kind: errandKind,
    amount: v.number(),
    currency: v.string(),
    terms: v.optional(v.string()),
    status: v.union(v.literal("proposed"), v.literal("accepted"), v.literal("rejected")),
    receivedAt: v.number(),
  })
    .index("by_production", ["productionId"])
    .index("by_errand", ["errandId"]),

  // Dedupe log for AgentMail inbound webhooks (they redeliver the same event).
  emailEvents: defineTable({
    eventId: v.string(),
    handled: v.boolean(),
    receivedAt: v.number(),
  }).index("by_event", ["eventId"]),
});
