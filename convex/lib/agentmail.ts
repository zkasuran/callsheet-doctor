// AgentMail REST client (v0) over fetch. No SDK, no "use node".
// Bearer AGENTMAIL_API_KEY from the Convex deployment env. Inboxes use the shared
// @agentmail.to domain, which needs no paid plan or DNS. Endpoint paths follow the
// documented v0 API and the send path used by the parallel reference repo; verify the
// exact create/reply/webhook paths against the live API once the key is set.

const BASE = "https://api.agentmail.to/v0";

function authHeaders(): Record<string, string> {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) throw new Error("AGENTMAIL_API_KEY not set on the Convex deployment");
  return { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
}

async function req<T = any>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`AgentMail ${method} ${path} ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}

export type SendResult = { message_id?: string; thread_id?: string; messageId?: string; threadId?: string };

export async function createInbox(input: {
  username: string;
  displayName?: string;
  domain?: string;
}): Promise<{ inbox_id?: string; inboxId?: string; email_address?: string }> {
  return req("/inboxes", {
    username: input.username,
    display_name: input.displayName,
    domain: input.domain ?? "agentmail.to",
  });
}

export async function sendMessage(
  inboxId: string,
  input: { to: string | string[]; subject: string; text: string; html?: string; labels?: string[] },
): Promise<SendResult> {
  return req(`/inboxes/${encodeURIComponent(inboxId)}/messages/send`, {
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    text: input.text,
    html: input.html,
    labels: input.labels,
  });
}

export async function replyMessage(
  inboxId: string,
  messageId: string,
  input: { text: string; html?: string },
): Promise<SendResult> {
  return req(
    `/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/reply`,
    { text: input.text, html: input.html },
  );
}

export async function registerWebhook(input: {
  url: string;
  eventTypes?: string[];
  clientId?: string;
}): Promise<{ webhook_id?: string; secret?: string }> {
  return req("/webhooks", {
    url: input.url,
    event_types: input.eventTypes ?? ["message.received"],
    client_id: input.clientId,
  });
}

// Normalize an inbound webhook payload across snake_case / camelCase / nested shapes.
export function normalizeInbound(payload: any): {
  eventType: string;
  eventId: string;
  inboxId: string;
  threadId: string;
  messageId: string;
  from: string;
  subject: string;
  text: string;
} {
  const m = payload?.message ?? payload?.data?.message ?? payload?.data ?? payload ?? {};
  return {
    eventType: payload?.event_type ?? payload?.type ?? "",
    eventId: payload?.event_id ?? payload?.eventId ?? payload?.id ?? "",
    inboxId: m.inbox_id ?? m.inboxId ?? "",
    threadId: m.thread_id ?? m.threadId ?? "",
    messageId: m.message_id ?? m.messageId ?? "",
    from: m.from ?? "",
    subject: m.subject ?? "",
    text: m.extracted_text ?? m.text ?? m.html ?? "",
  };
}
