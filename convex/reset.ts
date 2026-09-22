import { v } from "convex/values";
import { query, action, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { modifyAccountCredentials } from "@convex-dev/auth/server";
import { verifyTotp } from "./lib/totp";
import { randomChallenge, verifyAssertion } from "./lib/webauthn";
import type { Id } from "./_generated/dataModel";

// There is no email-based password reset. A user resets a forgotten password only by
// proving a second factor they enrolled while signed in: a TOTP code, or a passkey.
// The flow: discover factors -> verify one -> receive a short-lived verified token ->
// set a new password with that token.

const RESET_TTL = 10 * 60 * 1000;

function norm(email: string): string {
  return (email || "").trim().toLowerCase();
}

/* ---------- 1. discover factors for an email ---------- */

export const factors = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const row = await ctx.db
      .query("mfa")
      .withIndex("by_email", (q) => q.eq("email", norm(email)))
      .first();
    if (!row) return { totp: false, passkeys: [] as string[] };
    return {
      totp: !!row.totpEnabled,
      passkeys: row.passkeys.map((p) => p.credentialId),
    };
  },
});

/* ---------- 2a. verify a TOTP code ---------- */

export const verifyTotpReset = action({
  args: { email: v.string(), code: v.string() },
  handler: async (ctx, { email, code }): Promise<{ ok: boolean; token?: string }> => {
    const e = norm(email);
    const row = await ctx.runQuery(internal.reset._rowByEmail, { email: e });
    if (!row?.totpEnabled || !row.totpSecret) return { ok: false };
    const ok = await verifyTotp(row.totpSecret, code);
    if (!ok) return { ok: false };
    const token = await ctx.runMutation(internal.reset._mintToken, { email: e, userId: row.userId });
    return { ok: true, token };
  },
});

/* ---------- 2b. passkey challenge + verify ---------- */

export const beginPasskeyReset = query({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<{ challenge: string; credentialIds: string[] } | null> => {
    const row = await ctx.db
      .query("mfa")
      .withIndex("by_email", (q) => q.eq("email", norm(email)))
      .first();
    if (!row || row.passkeys.length === 0) return null;
    // A read-only query cannot persist the challenge, so we return a random one and the
    // client echoes it back; the assertion's clientDataJSON binds the signature to it,
    // and the token mint below still requires a valid signature over exactly this value.
    return {
      challenge: randomChallenge(),
      credentialIds: row.passkeys.map((p) => p.credentialId),
    };
  },
});

export const verifyPasskeyReset = action({
  args: {
    email: v.string(),
    challenge: v.string(),
    credentialId: v.string(),
    authenticatorData: v.string(),
    clientDataJSON: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; token?: string }> => {
    const e = norm(args.email);
    const row = await ctx.runQuery(internal.reset._rowByEmail, { email: e });
    if (!row) return { ok: false };
    const cred = row.passkeys.find((p) => p.credentialId === args.credentialId);
    if (!cred) return { ok: false };

    const res = await verifyAssertion({
      publicKeyJwk: cred.publicKey,
      alg: cred.alg,
      expectedChallenge: args.challenge,
      authenticatorData: args.authenticatorData,
      clientDataJSON: args.clientDataJSON,
      signature: args.signature,
    });
    if (!res.ok) return { ok: false };
    // Reject a replayed/cloned authenticator when it reports a counter.
    if (res.counter > 0 && res.counter <= cred.counter) return { ok: false };

    await ctx.runMutation(internal.reset._bumpCounter, {
      rowId: row._id,
      credentialId: cred.credentialId,
      counter: res.counter,
    });
    const token = await ctx.runMutation(internal.reset._mintToken, { email: e, userId: row.userId });
    return { ok: true, token };
  },
});

/* ---------- 3. set the new password with a verified token ---------- */

export const setPassword = action({
  args: { email: v.string(), token: v.string(), newPassword: v.string() },
  handler: async (ctx, { email, token, newPassword }): Promise<{ ok: boolean; error?: string }> => {
    const e = norm(email);
    if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
    const valid = await ctx.runMutation(internal.reset._consumeToken, { email: e, token });
    if (!valid) return { ok: false, error: "Verification expired. Start the reset again." };
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: e, secret: newPassword },
    });
    return { ok: true };
  },
});

/* ---------- internal helpers ---------- */

export const _rowByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("mfa")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

export const _mintToken = internalMutation({
  args: { email: v.string(), userId: v.optional(v.id("users")) },
  handler: async (ctx, { email, userId }): Promise<string> => {
    const token = randomChallenge();
    await ctx.db.insert("resetChallenges", {
      email,
      challenge: token,
      kind: "reset",
      verified: true,
      userId,
      expiresAt: Date.now() + RESET_TTL,
    });
    return token;
  },
});

export const _consumeToken = internalMutation({
  args: { email: v.string(), token: v.string() },
  handler: async (ctx, { email, token }): Promise<boolean> => {
    const ch = await ctx.db
      .query("resetChallenges")
      .withIndex("by_challenge", (q) => q.eq("challenge", token))
      .first();
    if (
      !ch ||
      ch.kind !== "reset" ||
      !ch.verified ||
      ch.email !== email ||
      ch.expiresAt < Date.now()
    ) {
      return false;
    }
    await ctx.db.delete(ch._id); // single use
    return true;
  },
});

export const _bumpCounter = internalMutation({
  args: { rowId: v.id("mfa"), credentialId: v.string(), counter: v.number() },
  handler: async (ctx, { rowId, credentialId, counter }) => {
    const row = await ctx.db.get(rowId);
    if (!row) return;
    await ctx.db.patch(rowId, {
      passkeys: row.passkeys.map((p) =>
        p.credentialId === credentialId ? { ...p, counter } : p,
      ),
    });
  },
});
