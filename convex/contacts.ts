import { v } from "convex/values";
import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { search, scrape } from "./lib/firecrawl";

export const list = query({
  args: { productionId: v.id("productions") },
  handler: async (ctx, { productionId }) => {
    const userId = await getAuthUserId(ctx);
    const p = await ctx.db.get(productionId);
    if (!p || p.ownerId !== userId) return [];
    return await ctx.db
      .query("contacts")
      .withIndex("by_production", (q) => q.eq("productionId", productionId))
      .collect();
  },
});

export const create = mutation({
  args: {
    productionId: v.id("productions"),
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const p = await ctx.db.get(args.productionId);
    if (!p || p.ownerId !== userId) throw new Error("Not your production");
    return await ctx.db.insert("contacts", args);
  },
});

export const _insert = internalMutation({
  args: {
    productionId: v.id("productions"),
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // dedupe by email within the production
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) =>
        q.eq("productionId", args.productionId).eq("email", args.email),
      )
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("contacts", args);
  },
});

export const _ownerCheck = internalQuery({
  args: { productionId: v.id("productions") },
  handler: (ctx, { productionId }) => ctx.db.get(productionId),
});

const CONTACT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: { type: "string" },
    company: { type: "string" },
    role: { type: "string" },
  },
} as const;

// Source candidates for a need. Firecrawl searches the web for the right kind of vendor
// or venue, then scrapes each hit for a real contact email. Returns what it inserted.
export const find = action({
  args: {
    productionId: v.id("productions"),
    kind: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { productionId, kind, query, limit },
  ): Promise<{ found: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const hits = await search(`${kind} ${query} contact email`, { limit: limit ?? 4 });
    let found = 0;
    for (const hit of hits) {
      if (!hit.url) continue;
      try {
        const scraped = await scrape(hit.url, {
          jsonSchema: CONTACT_SCHEMA,
          jsonPrompt:
            "Extract the primary business name, a contact email address, and the contact person name and role if present.",
        });
        const info = scraped.json ?? {};
        const email: string | undefined = info.email;
        if (!email || !email.includes("@")) continue;
        await ctx.runMutation(internal.contacts._insert, {
          productionId,
          name: info.name ?? hit.title ?? email.split("@")[1],
          email,
          role: info.role,
          company: info.company ?? hit.title,
          sourceUrl: hit.url,
        });
        found++;
      } catch {
        // a page that will not scrape is not fatal, keep going
        continue;
      }
    }
    return { found };
  },
});
