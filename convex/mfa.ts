import { v } from "convex/values";
import {
  query,
  mutation,
  action,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateTotpSecret, otpauthURI, verifyTotp } from "./lib/totp";
import { parseRegistration, randomChallenge } from "./lib/webauthn";
import type { Id } from "./_generated/dataModel";

const ISSUER = "Callsheet Doctor";
const CHALLENGE_TTL = 5 * 60 * 1000;

/* ---------- helpers ---------- */

async function userEmail(ctx: any, userId: Id<"users">): Promise<string> {
  const user = await ctx.db.get(userId);
  return (user?.email ?? "").toLowerCase();
}

async function getRow(ctx: any, userId: Id<"users">) {
  return await ctx.db
    .query("mfa")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
}

/* ---------- status (what the Security page shows) ---------- */

export const status = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await getRow(ctx, userId);
    return {
      totpEnabled: !!row?.totpEnabled,
      passkeys: (row?.passkeys ?? []).map((p: any) => ({
        credentialId: p.credentialId,
        label: p.label,
        createdAt: p.createdAt,
      })),
    };
  },
});

/* ---------- TOTP enrollment ---------- */

// Step 1: generate a secret and return the otpauth URI. Stored but not yet enabled;
// the user must prove they can generate a code before it counts as a factor.
export const beginTotp = mutation({
  args: {},
  handler: async (ctx): Promise<{ secret: string; uri: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const email = await userEmail(ctx, userId);
    const secret = generateTotpSecret();
    const uri = otpauthURI({ secret, label: email || "account", issuer: ISSUER });

    const row = await getRow(ctx, userId);
    if (row) {
      await ctx.db.patch(row._id, { totpSecret: secret, totpEnabled: false });
    } else {
      await ctx.db.insert("mfa", {
        userId,
        email,
        totpSecret: secret,
        totpEnabled: false,
        passkeys: [],
      });
    }
    return { secret, uri };
  },
});

// Step 2: confirm with a live code, which flips TOTP on.
export const confirmTotp = action({
  args: { code: v.string() },
  handler: async (ctx, { code }): Promise<{ ok: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const row = await ctx.runQuery(internal.mfa._row, { userId });
    if (!row?.totpSecret) throw new Error("Start the setup first");
    const ok = await verifyTotp(row.totpSecret, code);
    if (!ok) return { ok: false };
    await ctx.runMutation(internal.mfa._enableTotp, { rowId: row._id });
    return { ok: true };
  },
});

export const disableTotp = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const row = await getRow(ctx, userId);
    if (row) await ctx.db.patch(row._id, { totpSecret: undefined, totpEnabled: false });
  },
});

/* ---------- Passkey enrollment ---------- */

// Step 1: hand the browser a fresh challenge and the info it needs to create a passkey.
export const beginPasskey = mutation({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ challenge: string; userIdB64: string; email: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const email = await userEmail(ctx, userId);
    const challenge = randomChallenge();
    await ctx.db.insert("resetChallenges", {
      email,
      challenge,
      kind: "passkey_register",
      verified: false,
      userId,
      expiresAt: Date.now() + CHALLENGE_TTL,
    });
    // Use the Convex user id as the WebAuthn user handle (bytes).
    const userIdB64 = btoa(userId).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return { challenge, userIdB64, email };
  },
});

// Step 2: verify the challenge is one we issued, parse the attestation, store the key.
export const finishPasskey = mutation({
  args: {
    challenge: v.string(),
    attestationObject: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, { challenge, attestationObject, label }): Promise<{ ok: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    const ch = await ctx.db
      .query("resetChallenges")
      .withIndex("by_challenge", (q) => q.eq("challenge", challenge))
      .first();
    if (!ch || ch.kind !== "passkey_register" || ch.userId !== userId || ch.expiresAt < Date.now()) {
      throw new Error("Challenge expired, start again");
    }
    await ctx.db.delete(ch._id);

    const cred = parseRegistration(attestationObject);
    const email = await userEmail(ctx, userId);
    const entry = {
      credentialId: cred.credentialId,
      publicKey: cred.publicKeyJwk,
      alg: cred.alg,
      counter: cred.counter,
      label: label || "Passkey",
      createdAt: Date.now(),
    };

    const row = await getRow(ctx, userId);
    if (row) {
      await ctx.db.patch(row._id, { passkeys: [...row.passkeys, entry] });
    } else {
      await ctx.db.insert("mfa", {
        userId,
        email,
        totpEnabled: false,
        passkeys: [entry],
      });
    }
    return { ok: true };
  },
});

export const removePasskey = mutation({
  args: { credentialId: v.string() },
  handler: async (ctx, { credentialId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const row = await getRow(ctx, userId);
    if (row) {
      await ctx.db.patch(row._id, {
        passkeys: row.passkeys.filter((p: any) => p.credentialId !== credentialId),
      });
    }
  },
});

/* ---------- internal helpers for actions ---------- */

export const _row = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("mfa")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const _enableTotp = internalMutation({
  args: { rowId: v.id("mfa") },
  handler: async (ctx, { rowId }) => {
    await ctx.db.patch(rowId, { totpEnabled: true });
  },
});
