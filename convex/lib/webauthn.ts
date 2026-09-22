// Minimal WebAuthn (passkey) verification for the Convex default runtime.
// No dependency, no "use node". Enough of CBOR/COSE to:
//   - parse a registration attestationObject and pull out the credential public key
//   - verify an authentication assertion signature with Web Crypto
// Supports ES256 (-7) and RS256 (-257), which cover platform authenticators
// (Touch ID / Windows Hello / Android) and the common security keys.

/* ---------- base64url ---------- */

export function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomChallenge(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return bytesToB64url(buf);
}

/* ---------- tiny CBOR decoder (maps, byte strings, ints, text) ---------- */

function cborDecode(bytes: Uint8Array): { value: any; length: number } {
  let offset = 0;
  function read(): any {
    const first = bytes[offset++];
    const major = first >> 5;
    const info = first & 0x1f;
    const len = readLength(info);
    switch (major) {
      case 0:
        return len;
      case 1:
        return -1 - len;
      case 2: {
        const v = bytes.slice(offset, offset + len);
        offset += len;
        return v;
      }
      case 3: {
        const v = new TextDecoder().decode(bytes.slice(offset, offset + len));
        offset += len;
        return v;
      }
      case 4: {
        const arr: any[] = [];
        for (let i = 0; i < len; i++) arr.push(read());
        return arr;
      }
      case 5: {
        const map = new Map<any, any>();
        for (let i = 0; i < len; i++) {
          const k = read();
          map.set(k, read());
        }
        return map;
      }
      default:
        throw new Error(`unsupported CBOR major type ${major}`);
    }
  }
  function readLength(info: number): number {
    if (info < 24) return info;
    if (info === 24) return bytes[offset++];
    if (info === 25) {
      const v = (bytes[offset] << 8) | bytes[offset + 1];
      offset += 2;
      return v;
    }
    if (info === 26) {
      const v =
        bytes[offset] * 0x1000000 +
        (bytes[offset + 1] << 16) +
        (bytes[offset + 2] << 8) +
        bytes[offset + 3];
      offset += 4;
      return v;
    }
    throw new Error("CBOR length too large");
  }
  const value = read();
  return { value, length: offset };
}

/* ---------- authenticator data ---------- */

// Layout: rpIdHash(32) flags(1) counter(4) [aaguid(16) credIdLen(2) credId credPubKey(COSE)]
function parseAuthData(authData: Uint8Array) {
  const flags = authData[32];
  const counter =
    (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | authData[36];
  const result: {
    rpIdHash: Uint8Array;
    flags: number;
    counter: number;
    credentialId?: Uint8Array;
    coseKey?: Map<any, any>;
  } = { rpIdHash: authData.slice(0, 32), flags, counter };

  const attested = (flags & 0x40) !== 0;
  if (attested) {
    let o = 37 + 16; // skip aaguid
    const credIdLen = (authData[o] << 8) | authData[o + 1];
    o += 2;
    result.credentialId = authData.slice(o, o + credIdLen);
    o += credIdLen;
    const { value } = cborDecode(authData.slice(o));
    result.coseKey = value as Map<any, any>;
  }
  return result;
}

/* ---------- COSE key -> Web Crypto ---------- */

function coseToJwk(cose: Map<any, any>): { jwk: JsonWebKey; alg: number } {
  const kty = cose.get(1);
  const alg = cose.get(3);
  if (kty === 2) {
    // EC2 / P-256
    return {
      alg,
      jwk: {
        kty: "EC",
        crv: "P-256",
        x: bytesToB64url(cose.get(-2)),
        y: bytesToB64url(cose.get(-3)),
        ext: true,
      },
    };
  }
  if (kty === 3) {
    // RSA
    return {
      alg,
      jwk: {
        kty: "RSA",
        n: bytesToB64url(cose.get(-1)),
        e: bytesToB64url(cose.get(-2)),
        ext: true,
      },
    };
  }
  throw new Error(`unsupported COSE key type ${kty}`);
}

/** Parse a registration response. Returns the stored credential fields. */
export function parseRegistration(attestationObjectB64url: string): {
  credentialId: string;
  publicKeyJwk: string;
  alg: number;
  counter: number;
} {
  const { value } = cborDecode(b64urlToBytes(attestationObjectB64url));
  const authData: Uint8Array = (value as Map<any, any>).get("authData");
  const parsed = parseAuthData(authData);
  if (!parsed.credentialId || !parsed.coseKey) throw new Error("no attested credential data");
  const { jwk, alg } = coseToJwk(parsed.coseKey);
  return {
    credentialId: bytesToB64url(parsed.credentialId),
    publicKeyJwk: JSON.stringify(jwk),
    alg,
    counter: parsed.counter,
  };
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource));
}

// ES256 signatures come back DER-encoded; Web Crypto wants raw r||s (64 bytes).
function derToRaw(der: Uint8Array): Uint8Array {
  let o = 0;
  if (der[o++] !== 0x30) throw new Error("bad DER");
  if (der[o] & 0x80) o += 1 + (der[o] & 0x7f);
  else o++;
  const readInt = (): Uint8Array => {
    if (der[o++] !== 0x02) throw new Error("bad DER int");
    let len = der[o++];
    let val = der.slice(o, o + len);
    o += len;
    while (val.length > 32 && val[0] === 0) val = val.slice(1);
    return val;
  };
  const r = readInt();
  const s = readInt();
  const out = new Uint8Array(64);
  out.set(r, 32 - r.length);
  out.set(s, 64 - s.length);
  return out;
}

/**
 * Verify a WebAuthn assertion. Confirms the challenge in clientDataJSON matches, the
 * type is "webauthn.get", and the signature over authData||sha256(clientDataJSON) is
 * valid for the stored public key.
 */
export async function verifyAssertion(input: {
  publicKeyJwk: string;
  alg: number;
  expectedChallenge: string;
  authenticatorData: string; // b64url
  clientDataJSON: string; // b64url
  signature: string; // b64url
}): Promise<{ ok: boolean; counter: number }> {
  const clientDataBytes = b64urlToBytes(input.clientDataJSON);
  const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  if (clientData.type !== "webauthn.get") return { ok: false, counter: 0 };
  if (clientData.challenge !== input.expectedChallenge) return { ok: false, counter: 0 };

  const authData = b64urlToBytes(input.authenticatorData);
  const counter =
    (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | authData[36];

  const clientHash = await sha256(clientDataBytes);
  const signed = new Uint8Array(authData.length + clientHash.length);
  signed.set(authData, 0);
  signed.set(clientHash, authData.length);

  const jwk = JSON.parse(input.publicKeyJwk) as JsonWebKey;
  let sig = b64urlToBytes(input.signature);

  let key: CryptoKey;
  let verifyAlg: AlgorithmIdentifier | EcdsaParams | RsaPssParams;
  if (input.alg === -7) {
    key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    verifyAlg = { name: "ECDSA", hash: "SHA-256" };
    sig = derToRaw(sig);
  } else if (input.alg === -257) {
    key = await crypto.subtle.importKey(
      "jwk",
      { ...jwk, alg: "RS256" },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    verifyAlg = { name: "RSASSA-PKCS1-v1_5" };
  } else {
    return { ok: false, counter };
  }

  const ok = await crypto.subtle.verify(
    verifyAlg,
    key,
    sig as BufferSource,
    signed as BufferSource,
  );
  return { ok, counter };
}
