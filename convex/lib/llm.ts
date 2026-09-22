// Minimal OpenAI-compatible chat client over fetch. No SDK, no "use node".
//
// Primary target is GMI serving OpenAI's gpt-oss-120b (https://api.gmi-serving.com/v1).
// GMI's free capacity can return 429/503 under load, so this client:
//   1. retries the primary with backoff on 429/503/5xx,
//   2. falls back to a secondary OpenAI-compatible provider if one is configured
//      (FALLBACK_OPENAI_BASE_URL + FALLBACK_OPENAI_API_KEY + FALLBACK_OPENAI_MODEL).
// All values are read from the Convex deployment env.

const BASE = () => process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MODEL = () => process.env.OPENAI_MODEL ?? "openai/gpt-oss-120b";

type Msg = { role: "system" | "user" | "assistant"; content: string };

type Provider = { base: string; key: string; model: string };

function providers(): Provider[] {
  const list: Provider[] = [];
  const key = process.env.OPENAI_API_KEY;
  if (key) list.push({ base: BASE(), key, model: MODEL() });
  const fbKey = process.env.FALLBACK_OPENAI_API_KEY;
  const fbBase = process.env.FALLBACK_OPENAI_BASE_URL;
  if (fbKey && fbBase) {
    list.push({
      base: fbBase,
      key: fbKey,
      model: process.env.FALLBACK_OPENAI_MODEL ?? "gemini-2.0-flash",
    });
  }
  if (list.length === 0) throw new Error("No LLM provider configured on the Convex deployment");
  return list;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callProvider(
  p: Provider,
  messages: Msg[],
  opts?: { json?: boolean; temperature?: number },
): Promise<string> {
  // Up to 2 tries per provider on transient overload. Kept gentle on purpose: the free
  // gpt-oss and Gemini tiers have small quotas, so aggressive retries exhaust them. For a
  // heavier demo load, point OPENAI_* at a paid OpenAI-compatible key.
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${p.base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({
        model: p.model,
        messages,
        temperature: opts?.temperature ?? 0.3,
        ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    }
    lastErr = `${res.status}: ${(await res.text()).slice(0, 300)}`;
    // Only retry transient overload / server errors.
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s, 8s
      continue;
    }
    break; // 4xx other than 429 will not fix itself
  }
  throw new Error(lastErr || "LLM call failed");
}

async function chat(
  messages: Msg[],
  opts?: { json?: boolean; temperature?: number },
): Promise<string> {
  const ps = providers();
  let lastErr: unknown;
  for (const p of ps) {
    try {
      return await callProvider(p, messages, opts);
    } catch (e) {
      lastErr = e; // try the next provider
    }
  }
  throw new Error(`LLM ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

export async function chatText(system: string, user: string, temperature = 0.4): Promise<string> {
  return chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature },
  );
}

export async function chatJSON<T = unknown>(system: string, user: string): Promise<T> {
  const out = await chat(
    [
      {
        role: "system",
        content: system + "\nReply with a single valid JSON object and nothing else.",
      },
      { role: "user", content: user },
    ],
    { json: true, temperature: 0.2 },
  );
  // gpt-oss can wrap JSON in prose or code fences even with response_format, so extract defensively.
  try {
    return JSON.parse(out) as T;
  } catch {
    const m = out.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error(`LLM did not return JSON: ${out.slice(0, 300)}`);
  }
}
