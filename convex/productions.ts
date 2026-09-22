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
import { createInbox } from "./lib/agentmail";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "film"
  );
}

export const create = mutation({
  args: { name: v.string(), logline: v.optional(v.string()) },
  handler: async (ctx, { name, logline }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return await ctx.db.insert("productions", {
      name,
      logline,
      ownerId: userId,
      status: "active",
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("productions")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { productionId: v.id("productions") },
  handler: async (ctx, { productionId }) => {
    const userId = await getAuthUserId(ctx);
    const p = await ctx.db.get(productionId);
    if (!p || p.ownerId !== userId) return null;
    return p;
  },
});

export const _get = internalQuery({
  args: { productionId: v.id("productions") },
  handler: (ctx, { productionId }) => ctx.db.get(productionId),
});

export const _setInbox = internalMutation({
  args: {
    productionId: v.id("productions"),
    inboxId: v.string(),
    inboxAddress: v.string(),
  },
  handler: (ctx, a) =>
    ctx.db.patch(a.productionId, { inboxId: a.inboxId, inboxAddress: a.inboxAddress }),
});

// Provision the AgentMail inbox this production emails from. Idempotent per production.
// Safe to call before the AgentMail key exists: it surfaces a clear error the UI can show.
export const provisionInbox = action({
  args: { productionId: v.id("productions") },
  handler: async (ctx, { productionId }): Promise<{ inboxId: string; inboxAddress: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const p = await ctx.runQuery(internal.productions._get, { productionId });
    if (!p) throw new Error("Production not found");
    if (p.ownerId !== userId) throw new Error("Not your production");
    if (p.inboxId && p.inboxAddress) {
      return { inboxId: p.inboxId, inboxAddress: p.inboxAddress };
    }
    const username = `callsheet-${slugify(p.name)}-${Math.random().toString(36).slice(2, 7)}`;
    // AgentMail rejects punctuation like ( ) in display names, so keep it to letters,
    // numbers, spaces and a dash.
    const safeName = p.name.replace(/[^A-Za-z0-9 -]/g, "").trim().slice(0, 40) || "Production";
    const res = await createInbox({ username, displayName: `${safeName} via Callsheet Doctor` });
    // AgentMail returns inbox_id and email, and the inbox id IS the address.
    const inboxId = res.inbox_id ?? res.inboxId ?? `${username}@agentmail.to`;
    const inboxAddress = res.email ?? res.email_address ?? inboxId;
    await ctx.runMutation(internal.productions._setInbox, {
      productionId,
      inboxId,
      inboxAddress,
    });
    return { inboxId, inboxAddress };
  },
});
