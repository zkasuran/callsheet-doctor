import { v } from "convex/values";
import {
  mutation,
  action,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { chatJSON } from "./lib/llm";

const CATEGORIES =
  "location, cast, crew, gear, permit, catering, clearance, insurance, travel, festival, press, distribution";

export const addScript = mutation({
  args: { productionId: v.id("productions"), title: v.string(), text: v.string() },
  handler: async (ctx, { productionId, title, text }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const p = await ctx.db.get(productionId);
    if (!p || p.ownerId !== userId) throw new Error("Not your production");
    return await ctx.db.insert("scripts", {
      productionId,
      title,
      text,
      uploadedBy: userId,
    });
  },
});

export const listItems = query({
  args: { productionId: v.id("productions") },
  handler: async (ctx, { productionId }) => {
    const userId = await getAuthUserId(ctx);
    const p = await ctx.db.get(productionId);
    if (!p || p.ownerId !== userId) return [];
    return await ctx.db
      .query("breakdownItems")
      .withIndex("by_production", (q) => q.eq("productionId", productionId))
      .collect();
  },
});

export const _insertItems = internalMutation({
  args: {
    productionId: v.id("productions"),
    items: v.array(
      v.object({
        category: v.string(),
        name: v.string(),
        detail: v.optional(v.string()),
        sceneRefs: v.optional(v.array(v.string())),
      }),
    ),
  },
  handler: async (ctx, { productionId, items }) => {
    const valid = new Set(CATEGORIES.split(", "));
    let n = 0;
    for (const it of items) {
      const category = valid.has(it.category) ? it.category : "gear";
      await ctx.db.insert("breakdownItems", {
        productionId,
        category: category as any,
        name: it.name,
        detail: it.detail,
        sceneRefs: it.sceneRefs,
        status: "gap",
      });
      n++;
    }
    return n;
  },
});

export const _getProductionText = internalQuery({
  args: { productionId: v.id("productions") },
  handler: async (ctx, { productionId }) => {
    const scripts = await ctx.db
      .query("scripts")
      .withIndex("by_production", (q) => q.eq("productionId", productionId))
      .collect();
    return scripts.map((s) => s.text).join("\n\n");
  },
});

// The diagnosis. Read the script and list every production need as a breakdown item.
export const run = action({
  args: { productionId: v.id("productions") },
  handler: async (ctx, { productionId }): Promise<{ count: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const text = await ctx.runQuery(internal.breakdown._getProductionText, { productionId });
    if (!text.trim()) throw new Error("Add a script or treatment first");

    const result = await chatJSON<{
      items: Array<{ category: string; name: string; detail?: string; sceneRefs?: string[] }>;
    }>(
      `You are a film line producer doing a script breakdown. Read the script or treatment and list every concrete thing that must be sourced or arranged to shoot it. Each item has a category (exactly one of: ${CATEGORIES}), a short name, an optional one-line detail, and optional scene references. Focus on real, actionable needs a producer would chase over email. Return JSON: {"items": [{"category": "...", "name": "...", "detail": "...", "sceneRefs": ["..."]}]}`,
      text.slice(0, 12000),
    );

    const items = Array.isArray(result?.items) ? result.items.slice(0, 40) : [];
    const count = await ctx.runMutation(internal.breakdown._insertItems, { productionId, items });
    return { count };
  },
});
