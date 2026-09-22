// Firecrawl v2 REST client over fetch. No SDK, no "use node".
// Bearer FIRECRAWL_API_KEY from the Convex deployment env.
// scrape with a JSON schema is the primary structured-extraction path (synchronous),
// search finds festival pages, venues and business contacts.

const BASE = "https://api.firecrawl.dev/v2";

function authHeaders(): Record<string, string> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY not set on the Convex deployment");
  return { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
}

export async function scrape(
  url: string,
  opts?: { jsonSchema?: unknown; jsonPrompt?: string },
): Promise<{ markdown?: string; json?: any; metadata?: any }> {
  const formats: unknown[] = ["markdown"];
  if (opts?.jsonSchema || opts?.jsonPrompt) {
    formats.push({ type: "json", prompt: opts?.jsonPrompt, schema: opts?.jsonSchema });
  }
  const res = await fetch(`${BASE}/scrape`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ url, formats, onlyMainContent: true, maxAge: 3_600_000 }),
  });
  if (!res.ok) {
    throw new Error(`Firecrawl scrape ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

export async function search(
  query: string,
  opts?: { limit?: number },
): Promise<Array<{ url?: string; title?: string; description?: string; markdown?: string }>> {
  const res = await fetch(`${BASE}/search`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      query,
      limit: opts?.limit ?? 5,
      sources: [{ type: "web" }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Firecrawl search ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const data = await res.json();
  // v2 returns { data: { web: [...] } } or { data: [...] } depending on sources.
  const d = data.data ?? data;
  return d.web ?? d ?? [];
}
