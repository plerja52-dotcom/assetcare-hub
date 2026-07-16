// Password hashing (PBKDF2-SHA256, 120k iterations) using WebCrypto — works
// in both the Cloudflare Worker runtime and Node dev. Verification is
// constant-time via crypto.subtle.timingSafeEqual-equivalent length check +
// per-byte XOR compare.

const ITERATIONS = 120_000;

export function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(pw: string, salt: string, iterations = ITERATIONS): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2$${iterations}$${Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function verifyPassword(pw: string, salt: string, storedHash: string): Promise<boolean> {
  const attempt = await hashPassword(pw, salt);
  return timingSafeEqual(attempt, storedHash);
}
