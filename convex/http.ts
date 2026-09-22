import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { auth } from "./auth";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { verifySvix } from "./lib/svix";
import { normalizeInbound } from "./lib/agentmail";

const http = httpRouter();

// Convex Auth flows (/api/auth/*, /.well-known/*).
auth.addHttpRoutes(http);

// AgentMail inbound webhook. Register this URL in AgentMail as
// https://<deployment>.convex.site/agentmail/webhook
http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.text(); // RAW body, verify before parsing

    const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
    if (secret) {
      const ok = await verifySvix(
        secret,
        {
          id: req.headers.get("svix-id"),
          timestamp: req.headers.get("svix-timestamp"),
          signature: req.headers.get("svix-signature"),
        },
        body,
      );
      if (!ok) return new Response("bad signature", { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response("bad json", { status: 400 });
    }

    const inbound = normalizeInbound(payload);
    if (inbound.eventType !== "message.received" || !inbound.eventId) {
      return new Response(null, { status: 204 });
    }

    const res = await ctx.runMutation(internal.errands._ingestInbound, {
      eventId: inbound.eventId,
      threadId: inbound.threadId,
      messageId: inbound.messageId,
      from: inbound.from,
      subject: inbound.subject,
      text: inbound.text,
    });

    if (res?.errandId) {
      // Ack fast, run the LLM decision async.
      await ctx.scheduler.runAfter(0, internal.agent.handleInboundReply, {
        errandId: res.errandId,
        messageId: inbound.messageId,
        text: inbound.text,
      });
    }
    return new Response(null, { status: 200 });
  }),
});

// Serve the built SPA at the root. Registered LAST so the auth and webhook routes above win.
registerStaticRoutes(http, components.staticHosting);

export default http;
