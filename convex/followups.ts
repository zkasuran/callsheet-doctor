import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { chatText } from "./lib/llm";
import { sendMessage, replyMessage } from "./lib/agentmail";

const FOLLOWUP_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_FOLLOWUPS = 3;

// Cron entry point. Find waiting errands whose follow-up time has passed and nudge each.
// Transactional read + schedule: the sends fire only once this mutation commits.
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("errands")
      .withIndex("by_status_followup", (q) =>
        q.eq("status", "waiting").lte("nextFollowupAt", now),
      )
      .take(50);
    for (const e of due) {
      await ctx.scheduler.runAfter(0, internal.followups.sendOne, { errandId: e._id });
    }
    return { scheduled: due.length };
  },
});

export const sendOne = internalAction({
  args: { errandId: v.id("errands") },
  handler: async (ctx, { errandId }) => {
    const data = await ctx.runQuery(internal.errands._thread, { errandId });
    if (!data) return;
    const { errand, contact, production, messages } = data;
    if (!contact || !production?.inboxId) return;
    if (errand.status !== "waiting") return;

    // Give up politely after MAX_FOLLOWUPS and close the errand.
    if (errand.followupCount >= MAX_FOLLOWUPS) {
      await ctx.runMutation(internal.errands._patch, {
        errandId,
        status: "closed",
        nextFollowupAt: null,
      });
      return;
    }

    const body = await chatText(
      `You are Callsheet Doctor following up on an unanswered film production outreach about a ${errand.kind}. Write a brief, friendly nudge that references the earlier ask and gently requests a reply. Plain text, no markdown, no subject line. Sign off as "The ${production.name} team, via Callsheet Doctor".`,
      `Original ask: ${errand.goal}\nThis is follow-up number ${errand.followupCount + 1}.`,
    );

    const lastOutbound = [...messages]
      .reverse()
      .find((m) => m.direction === "outbound" && m.providerMessageId);

    try {
      let providerMessageId: string | undefined;
      if (lastOutbound?.providerMessageId) {
        const res = await replyMessage(production.inboxId, lastOutbound.providerMessageId, {
          text: body,
        });
        providerMessageId = res.message_id ?? res.messageId;
      } else {
        const res = await sendMessage(production.inboxId, {
          to: contact.email,
          subject: `Re: ${errand.subject}`,
          text: body,
          labels: ["callsheet", errand.kind, "followup"],
        });
        providerMessageId = res.message_id ?? res.messageId;
      }
      await ctx.runMutation(internal.errands._recordMessage, {
        errandId,
        productionId: errand.productionId,
        direction: "outbound",
        from: production.inboxAddress ?? production.inboxId,
        to: contact.email,
        subject: `Re: ${errand.subject}`,
        body,
        providerMessageId,
        providerThreadId: errand.providerThreadId,
      });
      await ctx.runMutation(internal.errands._patch, {
        errandId,
        lastOutboundAt: Date.now(),
        nextFollowupAt: Date.now() + FOLLOWUP_MS,
        followupCount: errand.followupCount + 1,
      });
    } catch {
      // transient send failure, the cron will retry on the next sweep
    }
  },
});
