import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { chatText, chatJSON } from "./lib/llm";
import { sendMessage, replyMessage } from "./lib/agentmail";

const FOLLOWUP_MS = 3 * 24 * 60 * 60 * 1000;

// Send a human-written (or human-edited) reply in the errand's thread, from the
// production inbox. This is the manual counterpart to the agent's auto-replies.
export const reply = action({
  args: { errandId: v.id("errands"), text: v.string() },
  handler: async (ctx, { errandId, text }): Promise<{ sent: boolean; note?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const data = await ctx.runQuery(internal.errands._thread, { errandId });
    if (!data) throw new Error("Errand not found");
    const { errand, contact, production, messages } = data;
    if (production?.ownerId !== userId) throw new Error("Not your errand");
    if (!contact) throw new Error("Errand has no contact");
    if (!text.trim()) return { sent: false, note: "Nothing to send." };
    if (!production?.inboxId) {
      return { sent: false, note: "Provision the production inbox first." };
    }

    const lastOutbound = [...messages]
      .reverse()
      .find((m) => m.direction === "outbound" && m.providerMessageId);

    let providerMessageId: string | undefined;
    let threadId = errand.providerThreadId;
    try {
      if (lastOutbound?.providerMessageId) {
        const res = await replyMessage(production.inboxId, lastOutbound.providerMessageId, { text });
        providerMessageId = res.message_id ?? res.messageId;
        threadId = res.thread_id ?? res.threadId ?? threadId;
      } else {
        const res = await sendMessage(production.inboxId, {
          to: contact.email,
          subject: errand.subject,
          text,
          labels: ["callsheet", errand.kind],
        });
        providerMessageId = res.message_id ?? res.messageId;
        threadId = res.thread_id ?? res.threadId ?? threadId;
      }
    } catch (e) {
      return { sent: false, note: e instanceof Error ? e.message : "Send failed." };
    }

    await ctx.runMutation(internal.errands._recordMessage, {
      errandId,
      productionId: errand.productionId,
      direction: "outbound",
      from: production.inboxAddress ?? production.inboxId,
      to: contact.email,
      subject: `Re: ${errand.subject}`,
      body: text,
      providerMessageId,
      providerThreadId: threadId,
    });
    await ctx.runMutation(internal.errands._patch, {
      errandId,
      status: errand.status === "draft" ? "waiting" : errand.status,
      providerThreadId: threadId,
      lastOutboundAt: Date.now(),
      nextFollowupAt: Date.now() + FOLLOWUP_MS,
    });
    return { sent: true };
  },
});

// Suggest a reply for the composer, given the thread so far. The user reviews and edits
// before sending, so this never sends on its own.
export const draftReply = action({
  args: { errandId: v.id("errands") },
  handler: async (ctx, { errandId }): Promise<{ text: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const data = await ctx.runQuery(internal.errands._thread, { errandId });
    if (!data) throw new Error("Errand not found");
    const { errand, contact, production, messages } = data;
    if (production?.ownerId !== userId) throw new Error("Not your errand");

    const transcript = messages
      .map((m) => `${m.direction === "inbound" ? contact?.name ?? "Them" : "Us"}: ${m.body}`)
      .join("\n---\n")
      .slice(0, 6000);

    const text = await chatText(
      `You are Callsheet Doctor, a concise, warm film production coordinator writing on behalf of "${production?.name}". Write the next reply in this ${errand.kind} email thread that moves it toward the goal. Plain text only, no markdown, no subject line. Sign off as "The ${production?.name} team".`,
      `Goal: ${errand.goal}\n\nThread so far:\n${transcript || "(no messages yet, this is the opening email)"}`,
    );
    return { text };
  },
});

// Draft and send the first outreach email for an errand, then set it waiting.
export const startOutreach = action({
  args: { errandId: v.id("errands") },
  handler: async (ctx, { errandId }): Promise<{ sent: boolean; note?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    const ctxData = await ctx.runQuery(internal.errands._thread, { errandId });
    if (!ctxData) throw new Error("Errand not found");
    const { errand, contact, production } = ctxData;
    if (!contact) throw new Error("Errand has no contact");
    if (!production?.inboxId) {
      return { sent: false, note: "Provision the production inbox first (needs the AgentMail key)." };
    }

    const body = await chatText(
      `You are Callsheet Doctor, a concise, warm film production coordinator writing on behalf of the production "${production.name}". Write a short outreach email to a ${errand.kind} contact. State who we are, what we need, ask for availability and a ballpark quote, and invite a reply. Plain text only, no markdown, no subject line. Sign off as "The ${production.name} team, via Callsheet Doctor".`,
      `Contact: ${contact.name}${contact.company ? ` at ${contact.company}` : ""} (${contact.email}).\nWhat we need: ${errand.goal}\nLogline: ${production.logline ?? "n/a"}`,
    );

    const res = await sendMessage(production.inboxId, {
      to: contact.email,
      subject: errand.subject,
      text: body,
      labels: ["callsheet", errand.kind],
    });
    const threadId = res.thread_id ?? res.threadId;
    const messageId = res.message_id ?? res.messageId;

    await ctx.runMutation(internal.errands._recordMessage, {
      errandId,
      productionId: errand.productionId,
      direction: "outbound",
      from: production.inboxAddress ?? production.inboxId,
      to: contact.email,
      subject: errand.subject,
      body,
      providerMessageId: messageId,
      providerThreadId: threadId,
    });
    await ctx.runMutation(internal.errands._patch, {
      errandId,
      status: "waiting",
      providerThreadId: threadId,
      lastOutboundAt: Date.now(),
      nextFollowupAt: Date.now() + FOLLOWUP_MS,
    });
    return { sent: true };
  },
});

// The brain: read a real inbound reply, decide the outcome, record a quote, and reply if useful.
export const handleInboundReply = internalAction({
  args: { errandId: v.id("errands"), messageId: v.string(), text: v.string() },
  handler: async (ctx, { errandId, messageId }) => {
    const data = await ctx.runQuery(internal.errands._thread, { errandId });
    if (!data) return;
    const { errand, contact, production, messages } = data;
    if (!contact || !production) return;

    const transcript = messages
      .map((m) => `${m.direction === "inbound" ? contact.name : "Us"}: ${m.body}`)
      .join("\n---\n")
      .slice(0, 8000);

    const decision = await chatJSON<{
      status: string;
      quote: { amount: number; currency: string; terms?: string } | null;
      reply: string | null;
      reason: string;
    }>(
      `You are Callsheet Doctor handling a reply to a film production outreach about a ${errand.kind}. Read the thread and the latest reply, then decide the outcome. status is one of: waiting, negotiating, confirmed, declined, replied. quote is the price they offered as {amount, currency, terms} or null. reply is a short plain-text reply to send now (to negotiate, confirm, or ask a follow-up) or null if no reply is needed yet. Keep replies concise and professional. Goal of this errand: ${errand.goal}. Return JSON {status, quote, reply, reason}.`,
      transcript,
    );

    const validStatus = ["waiting", "negotiating", "confirmed", "declined", "replied"];
    const status = validStatus.includes(decision?.status) ? decision.status : "replied";

    if (decision?.quote && typeof decision.quote.amount === "number") {
      await ctx.runMutation(internal.errands._insertQuote, {
        errandId,
        productionId: errand.productionId,
        contactId: errand.contactId,
        kind: errand.kind,
        amount: decision.quote.amount,
        currency: decision.quote.currency || "USD",
        terms: decision.quote.terms,
      });
    }

    await ctx.runMutation(internal.errands._patch, {
      errandId,
      status,
      nextFollowupAt: status === "confirmed" || status === "declined" ? null : Date.now() + FOLLOWUP_MS,
    });

    if (decision?.reply && production.inboxId && messageId) {
      try {
        const res = await replyMessage(production.inboxId, messageId, { text: decision.reply });
        await ctx.runMutation(internal.errands._recordMessage, {
          errandId,
          productionId: errand.productionId,
          direction: "outbound",
          from: production.inboxAddress ?? production.inboxId,
          to: contact.email,
          subject: `Re: ${errand.subject}`,
          body: decision.reply,
          providerMessageId: res.message_id ?? res.messageId,
          providerThreadId: errand.providerThreadId,
        });
        await ctx.runMutation(internal.errands._patch, { errandId, lastOutboundAt: Date.now() });
      } catch {
        // reply send failed, the reply is still recorded as the decision reason in logs
      }
    }
  },
});
