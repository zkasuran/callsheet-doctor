// Inline Svix webhook verification with Web Crypto. No "use node", no svix dependency,
// so it runs directly inside the Convex httpAction (default) runtime.
// Pattern verified against production reference repos (Enoch208/parallel, zaikaman/ClaimHero).

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Verify an AgentMail (Svix) webhook. `body` must be the RAW request text, verified
// before any JSON.parse. Enforces the standard 5 minute timestamp tolerance.
export async function verifySvix(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
): Promise<boolean> {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;

  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(rawSecret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const toSign = `${headers.id}.${headers.timestamp}.${body}`;
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(toSign) as BufferSource,
  );
  const expected = bytesToBase64(new Uint8Array(digest));

  // The signature header can carry several space-delimited "v1,<base64>" entries.
  return headers.signature
    .split(" ")
    .map((p) => (p.startsWith("v1,") ? p.slice(3) : ""))
    .some((c) => c !== "" && timingSafeEqual(c, expected));
}
