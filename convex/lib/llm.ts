// Minimal OpenAI-compatible chat client over fetch. No SDK, no "use node".
// Points at OPENAI_BASE_URL. Default target is GMI serving OpenAI's gpt-oss-120b
// (https://api.gmi-serving.com/v1). Swap to OpenAI's hosted API by unsetting the base
// URL and setting OPENAI_MODEL=gpt-5-mini. Values read from the Convex deployment env.

const BASE = () => process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MODEL = () => process.env.OPENAI_MODEL ?? "openai/gpt-oss-120b";

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function chat(
  messages: Msg[],
  opts?: { json?: boolean; temperature?: number },
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set on the Convex deployment");

  const res = await fetch(`${BASE()}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL(),
      messages,
      temperature: opts?.temperature ?? 0.3,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function chatText(system: string, user: string, temperature = 0.4): Promise<string> {
  return chat([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { temperature });
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
