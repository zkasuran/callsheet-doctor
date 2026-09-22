// Browser-side WebAuthn helpers. Convert between the ArrayBuffers the platform API
// uses and the base64url strings the Convex backend stores and verifies.

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

/** Create a new passkey. Returns the attestationObject (b64url) the backend parses. */
export async function registerPasskey(opts: {
  challenge: string;
  userIdB64: string;
  email: string;
}): Promise<{ attestationObject: string; label: string }> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: b64urlToBytes(opts.challenge) as BufferSource,
      rp: { name: "Callsheet Doctor", id: window.location.hostname },
      user: {
        id: b64urlToBytes(opts.userIdB64) as BufferSource,
        name: opts.email,
        displayName: opts.email,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("No credential created");
  const resp = cred.response as AuthenticatorAttestationResponse;
  const label =
    /iphone|ipad|mac/i.test(navigator.userAgent)
      ? "Apple passkey"
      : /windows/i.test(navigator.userAgent)
        ? "Windows Hello"
        : /android/i.test(navigator.userAgent)
          ? "Android passkey"
          : "Passkey";
  return { attestationObject: bytesToB64url(resp.attestationObject), label };
}

/** Sign a reset challenge with an existing passkey. */
export async function assertPasskey(opts: {
  challenge: string;
  credentialIds: string[];
}): Promise<{
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
}> {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: b64urlToBytes(opts.challenge) as BufferSource,
      rpId: window.location.hostname,
      allowCredentials: opts.credentialIds.map((id) => ({
        type: "public-key",
        id: b64urlToBytes(id) as BufferSource,
      })),
      userVerification: "preferred",
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("No assertion");
  const resp = cred.response as AuthenticatorAssertionResponse;
  return {
    credentialId: cred.id,
    authenticatorData: bytesToB64url(resp.authenticatorData),
    clientDataJSON: bytesToB64url(resp.clientDataJSON),
    signature: bytesToB64url(resp.signature),
  };
}
