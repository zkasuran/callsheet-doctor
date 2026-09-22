// RFC 6238 TOTP with Web Crypto (HMAC-SHA1). Runs in the Convex default runtime,
// no "use node", no dependency. Works with Google Authenticator, Authy, 1Password, etc.

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Random base32 secret (default 20 bytes = 160 bits, the RFC-recommended size). */
export function generateTotpSecret(bytes = 20): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base32Encode(buf);
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** otpauth:// URI for the QR code an authenticator app scans. */
export function otpauthURI(opts: { secret: string; label: string; issuer: string }): string {
  const label = encodeURIComponent(`${opts.issuer}:${opts.label}`);
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer: opts.issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

async function hotp(secret: string, counter: number): Promise<string> {
  const key = base32Decode(secret);
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, msg as BufferSource));
  const offset = sig[19] & 0xf;
  const bin =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, "0");
}

/** Verify a 6-digit code against the secret, allowing +/- one 30s step for clock drift. */
export async function verifyTotp(secret: string, code: string, period = 30): Promise<boolean> {
  const clean = (code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const counter = Math.floor(Date.now() / 1000 / period);
  for (const w of [-1, 0, 1]) {
    if (await hotp(secret, counter + w) === clean) return true;
  }
  return false;
}
