export interface PasswordHash {
  salt: string;
  hash: string;
}

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.replace(/[^0-9a-f]/gi, "");
  const buf = new ArrayBuffer(clean.length / 2);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return arr;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function hashLegacy(password: string, saltHex: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const data = (saltHex + ":" + password + ":linkdit-pad-lock").split("");
  for (const ch of data) {
    const c = ch.charCodeAt(0);
    h1 = (h1 ^ c) * 16777619;
    h2 = (h2 * 31 + c) | 0;
  }
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}

function hasWebCrypto(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  if (hasWebCrypto()) {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );
      const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
        key,
        256
      );
      return { salt: toHex(salt), hash: toHex(new Uint8Array(bits)) };
    } catch {}
  }
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { salt, hash: hashLegacy(password, salt) };
}

export async function verifyPassword(
  password: string,
  saltHex: string,
  expectedHash: string
): Promise<boolean> {
  if (hasWebCrypto()) {
    try {
      const salt = fromHex(saltHex);
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );
      const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
        key,
        256
      );
      const derived = toHex(new Uint8Array(bits));
      return constantTimeEqual(derived, expectedHash);
    } catch {}
  }
  return constantTimeEqual(hashLegacy(password, saltHex), expectedHash);
}