import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { errandKind } from "./schema";
import type { Doc, Id } from "./_generated/dataModel";

async function assertOwner(ctx: any, productionId: Id<"productions">) {
  const userId = await getAuthUserId(ctx);
  const p = await ctx.db.get(productionId);
  if (!p || p.ownerId !== userId) return null;
  return p as Doc<"productions">;
}

export const create = mutation({
  args: {
    productionId: v.id("productions"),
    contactId: v.id("contacts"),
    kind: errandKind,
    subject: v.string(),
    goal: v.string(),
    breakdownItemId: v.optional(v.id("breakdownItems")),
  },
  handler: async (ctx, args) => {
    if (!(await assertOwner(ctx, args.productionId))) throw new Error("Not your production");
    return await ctx.db.insert("errands", {
      ...args,
      status: "draft",
      followupCount: 0,
    });
  },
});

// The live production chart: every errand with its contact and last message.
export const board = query({
  args: { productionId: v.id("productions") },
  handler: async (ctx, { productionId }) => {
    if (!(await assertOwner(ctx, productionId))) return [];
    const errands = await ctx.db
      .query("errands")
      .withIndex("by_production", (q) => q.eq("productionId", productionId))
      .order("desc")
      .collect();
    return await Promise.all(
      errands.map(async (e) => {
        const contact = await ctx.db.get(e.contactId);
        const msgs = await ctx.db
          .query("messages")
          .withIndex("by_errand", (q) => q.eq("errandId", e._id))
          .order("desc")
          .take(1);
        return { ...e, contact, lastMessage: msgs[0] ?? null };
      }),
    );
  },
});

export const get = query({
  args: { errandId: v.id("errands") },
  handler: async (ctx, { errandId }) => {
    const e = await ctx.db.get(errandId);
    if (!e) return null;
    if (!(await assertOwner(ctx, e.productionId))) return null;
    const contact = await ctx.db.get(e.contactId);
    return { ...e, contact };
  },
});

export const messagesFor = query({
  args: { errandId: v.id("errands") },
  handler: async (ctx, { errandId }) => {
    const e = await ctx.db.get(errandId);
    if (!e || !(await assertOwner(ctx, e.productionId))) return [];
    return await ctx.db
      .query("messages")
      .withIndex("by_errand", (q) => q.eq("errandId", errandId))
      .order("asc")
      .collect();
  },
});

// Live budget: every real quote that has arrived over email, summed.
export const budget = query({
  args: { productionId: v.id("productions") },
  handler: async (ctx, { productionId }) => {
    if (!(await assertOwner(ctx, productionId))) return { accepted: 0, proposed: 0, byKind: {} };
    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_production", (q) => q.eq("productionId", productionId))
      .collect();
    let accepted = 0;
    let proposed = 0;
    const byKind: Record<string, number> = {};
    for (const q of quotes) {
      if (q.status === "accepted") accepted += q.amount;
      if (q.status === "proposed") proposed += q.amount;
      byKind[q.kind] = (byKind[q.kind] ?? 0) + q.amount;
    }
    return { accepted, proposed, byKind, currency: quotes[0]?.currency ?? "USD" };
  },
});

// ---- internal helpers used by actions / the webhook ----

export const _get = internalQuery({
  args: { errandId: v.id("errands") },
  handler: (ctx, { errandId }) => ctx.db.get(errandId),
});

export const _thread = internalQuery({
  args: { errandId: v.id("errands") },
  handler: async (ctx, { errandId }) => {
    const errand = await ctx.db.get(errandId);
    if (!errand) return null;
    const contact = await ctx.db.get(errand.contactId);
    const production = await ctx.db.get(errand.productionId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_errand", (q) => q.eq("errandId", errandId))
      .order("asc")
      .collect();
    return { errand, contact, production, messages };
  },
});

export const _patch = internalMutation({
  args: {
    errandId: v.id("errands"),
    status: v.optional(v.string()),
    providerThreadId: v.optional(v.string()),
    lastOutboundAt: v.optional(v.number()),
    lastInboundAt: v.optional(v.number()),
    nextFollowupAt: v.optional(v.union(v.number(), v.null())),
    followupCount: v.optional(v.number()),
  },
  handler: async (ctx, { errandId, ...rest }) => {
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(rest)) {
      if (val === undefined) continue;
      patch[k] = val === null ? undefined : val;
    }
    await ctx.db.patch(errandId, patch);
  },
});

export const _recordMessage = internalMutation({
  args: {
    errandId: v.id("errands"),
    productionId: v.id("productions"),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    from: v.string(),
    to: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    providerMessageId: v.optional(v.string()),
    providerThreadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", { ...args, sentAt: Date.now() });
  },
});

// Inbound webhook ingestion: dedupe, record, link to the errand by thread id.
export const _ingestInbound = internalMutation({
  args: {
    eventId: v.string(),
    threadId: v.string(),
    messageId: v.string(),
    from: v.string(),
    subject: v.string(),
    text: v.string(),
  },
  handler: async (ctx, a): Promise<{ errandId?: Id<"errands">; duplicate?: boolean }> => {
    const seen = await ctx.db
      .query("emailEvents")
      .withIndex("by_event", (q) => q.eq("eventId", a.eventId))
      .first();
    if (seen) return { duplicate: true };
    await ctx.db.insert("emailEvents", {
      eventId: a.eventId,
      handled: true,
      receivedAt: Date.now(),
    });
    if (!a.threadId) return {};
    const errand = await ctx.db
      .query("errands")
      .withIndex("by_provider_thread", (q) => q.eq("providerThreadId", a.threadId))
      .first();
    if (!errand) return {};
    await ctx.db.insert("messages", {
      errandId: errand._id,
      productionId: errand.productionId,
      direction: "inbound",
      from: a.from,
      to: "",
      subject: a.subject,
      body: a.text,
      providerMessageId: a.messageId,
      providerThreadId: a.threadId,
      sentAt: Date.now(),
    });
    await ctx.db.patch(errand._id, {
      status: "replied",
      lastInboundAt: Date.now(),
      nextFollowupAt: undefined,
    });
    return { errandId: errand._id };
  },
});

export const _insertQuote = internalMutation({
  args: {
    errandId: v.id("errands"),
    productionId: v.id("productions"),
    contactId: v.id("contacts"),
    kind: errandKind,
    amount: v.number(),
    currency: v.string(),
    terms: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("quotes", { ...a, status: "proposed", receivedAt: Date.now() });
  },
});
