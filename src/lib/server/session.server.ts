// Session cookie helpers. The cookie holds a raw opaque token; the DB stores
// only the SHA-256 hash so an attacker who reads the sessions table cannot
// impersonate anyone.

import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { randomToken } from "./hash.server";
import {
  findSessionByTokenHash,
  findUserById,
  insertSession,
  revokeSessionById,
  touchSession,
  type UserRow,
} from "./db.server";

export const SESSION_COOKIE = "rid_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const SESSION_IDLE_MS = 8 * 60 * 60 * 1000; // 8h idle => Expired in the UI

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSessionForUser(user: UserRow): Promise<string> {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  await insertSession({
    id: crypto.randomUUID(),
    token_hash: tokenHash,
    user_id: user.id,
    user_name: user.name,
    login_at: now,
    last_active_at: now,
    revoked: 0,
    revoked_at: null,
  });
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return token;
}

export async function clearSessionCookie(): Promise<void> {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    const tokenHash = await sha256Hex(token);
    const existing = await findSessionByTokenHash(tokenHash);
    if (existing) await revokeSessionById(existing.id);
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export interface SessionContext {
  user: UserRow;
  sessionId: string;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const session = await findSessionByTokenHash(tokenHash);
  if (!session) return null;
  const user = await findUserById(session.user_id);
  if (!user || user.active !== 1 || user.status !== "approved") return null;
  // Touch session async (fire-and-forget-ish; we still await so D1 write actually flushes).
  await touchSession(session.id);
  return { user, sessionId: session.id };
}

export async function requireAdmin(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw jsonResponse({ error: "Unauthorized" }, 401);
  if (ctx.user.role !== "Admin") throw jsonResponse({ error: "Forbidden" }, 403);
  return ctx;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Public projection — never leak password_hash / salt to the client.
export function publicUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    role: u.role,
    active: u.active === 1,
    status: u.status,
    createdAt: u.created_at,
  };
}
