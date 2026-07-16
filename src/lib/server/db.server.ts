// Data-access layer for auth. Uses Cloudflare D1 when the Worker `env.DB`
// binding is present; otherwise falls back to a JSON file at `.data/auth.json`
// so `vite dev` (and `wrangler dev` without D1 wired) still works.
//
// The two backends share the same shape and identical row schemas — swapping
// deployments should never change semantics.

import { promises as fs } from "node:fs";
import path from "node:path";
import { getEnv, type D1DatabaseLike } from "./env-context";

export type UserStatus = "pending" | "approved" | "rejected";
export type Role = "Admin" | "User";

export interface UserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  password_hash: string;
  salt: string;
  role: Role;
  active: number;
  status: UserStatus;
  created_at: string;
}

export interface SessionRow {
  id: string;
  token_hash: string;
  user_id: string;
  user_name: string;
  login_at: string;
  last_active_at: string;
  revoked: number;
  revoked_at: string | null;
}

// -------- D1 backend --------
function d1(): D1DatabaseLike | null {
  const env = getEnv();
  return (env?.DB ?? null) as D1DatabaseLike | null;
}

async function ensureD1Schema(db: D1DatabaseLike) {
  // Idempotent — safe to run each cold start. Migration 0002 also creates
  // these but we can't rely on it having been applied against fresh D1s.
  await db.exec(
    [
      `CREATE TABLE IF NOT EXISTS users (
         id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
         email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, salt TEXT NOT NULL,
         role TEXT NOT NULL CHECK (role IN ('Admin','User')),
         active INTEGER NOT NULL DEFAULT 1,
         status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
         created_at TEXT NOT NULL DEFAULT (datetime('now'))
       );`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
      `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`,
      `CREATE TABLE IF NOT EXISTS sessions (
         id TEXT PRIMARY KEY,
         token_hash TEXT NOT NULL UNIQUE,
         user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         user_name TEXT NOT NULL,
         login_at TEXT NOT NULL DEFAULT (datetime('now')),
         last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
         revoked INTEGER NOT NULL DEFAULT 0,
         revoked_at TEXT
       );`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);`,
    ].join("\n"),
  );
}

// -------- JSON-file backend (dev only) --------
interface FileShape { users: UserRow[]; sessions: SessionRow[] }

const DEV_FILE = path.resolve(process.cwd(), ".data", "auth.json");
let fileWriteChain: Promise<unknown> = Promise.resolve();

async function readFile(): Promise<FileShape> {
  try {
    const raw = await fs.readFile(DEV_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<FileShape>;
    return { users: parsed.users ?? [], sessions: parsed.sessions ?? [] };
  } catch {
    return { users: [], sessions: [] };
  }
}

async function writeFile(data: FileShape): Promise<void> {
  fileWriteChain = fileWriteChain.then(async () => {
    await fs.mkdir(path.dirname(DEV_FILE), { recursive: true });
    await fs.writeFile(DEV_FILE, JSON.stringify(data, null, 2));
  });
  await fileWriteChain;
}

// -------- Public helpers --------
export async function countUsers(): Promise<number> {
  const db = d1();
  if (db) {
    await ensureD1Schema(db);
    const row = await db.prepare("SELECT COUNT(*) AS c FROM users").first<{ c: number }>();
    return Number(row?.c ?? 0);
  }
  const file = await readFile();
  return file.users.length;
}

export async function findUserByEmailOrUsername(identifier: string): Promise<UserRow | null> {
  const norm = identifier.trim().toLowerCase();
  if (!norm) return null;
  const db = d1();
  if (db) {
    await ensureD1Schema(db);
    return await db
      .prepare("SELECT * FROM users WHERE lower(email) = ?1 OR lower(username) = ?1 LIMIT 1")
      .bind(norm)
      .first<UserRow>();
  }
  const file = await readFile();
  return (
    file.users.find(
      (u) => u.email.toLowerCase() === norm || u.username.toLowerCase() === norm,
    ) ?? null
  );
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const db = d1();
  if (db) {
    await ensureD1Schema(db);
    return await db.prepare("SELECT * FROM users WHERE id = ?1").bind(id).first<UserRow>();
  }
  const file = await readFile();
  return file.users.find((u) => u.id === id) ?? null;
}

export async function listUsers(): Promise<UserRow[]> {
  const db = d1();
  if (db) {
    await ensureD1Schema(db);
    const res = await db.prepare("SELECT * FROM users ORDER BY created_at DESC").all<UserRow>();
    return res.results;
  }
  const file = await readFile();
  return [...file.users].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function insertUser(u: UserRow): Promise<void> {
  const db = d1();
  if (db) {
    await ensureD1Schema(db);
    await db
      .prepare(
        `INSERT INTO users (id, name, username, email, password_hash, salt, role, active, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      )
      .bind(u.id, u.name, u.username, u.email, u.password_hash, u.salt, u.role, u.active, u.status, u.created_at)
      .run();
    return;
  }
  const file = await readFile();
  file.users.push(u);
  await writeFile(file);
}

export interface UserPatch {
  name?: string;
  role?: Role;
  active?: boolean;
  status?: UserStatus;
}

export async function updateUserFields(id: string, patch: UserPatch): Promise<void> {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const db = d1();
  if (db) {
    await ensureD1Schema(db);
    // Column allow-list keyed off UserPatch — never interpolate arbitrary keys.
    const ALLOWED = new Set(["name", "role", "active", "status"]);
    const safe = entries.filter(([k]) => ALLOWED.has(k));
    if (safe.length === 0) return;
    const cols = safe.map(([k], i) => `${k} = ?${i + 2}`).join(", ");
    const values = safe.map(([, v]) => (typeof v === "boolean" ? (v ? 1 : 0) : v));
    await db.prepare(`UPDATE users SET ${cols} WHERE id = ?1`).bind(id, ...values).run();
    return;
  }
  const file = await readFile();
  file.users = file.users.map((u) => {
    if (u.id !== id) return u;
    const next: UserRow = { ...u };
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.role !== undefined) next.role = patch.role;
    if (patch.status !== undefined) next.status = patch.status;
    if (patch.active !== undefined) next.active = patch.active ? 1 : 0;
    return next;
  });
  await writeFile(file);
}

export async function deleteUser(id: string): Promise<void> {
  const db = d1();
  if (db) {
    await ensureD1Schema(db);
    await db.prepare("DELETE FROM users WHERE id = ?1").bind(id).run();
    return;
  }
  const file = await readFile();
  file.users = file.users.filter((u) => u.id !== id);
  file.sessions = file.sessions.filter((s) => s.user_id !== id);
  await writeFile(file);
}

// -------- sessions --------
export async function insertSession(row: SessionRow): Promise<void> {
  const db = d1();
  if (db) {
    await ensureD1Schema(db);
    // Revoke all prior active sessions for this user first (single-session policy).
    await db
      .prepare("UPDATE sessions SET revoked = 1, revoked_at = datetime('now') WHERE user_id = ?1 AND revoked = 0")
      .bind(row.user_id)
      .run();
    await db
      .prepare(
        `INSERT INTO sessions (id, token_hash, user_id, user_name, login_at, last_active_at, revoked, revoked_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(row.id, row.token_hash, row.user_id, row.user_name, row.login_at, row.last_active_at, row.revoked, row.revoked_at)
      .run();
    return;
  }
  const file = await readFile();
  const now = new Date().toISOString();
  file.sessions = file.sessions.map((s) =>
    s.user_id === row.user_id && s.revoked === 0 ? { ...s, revoked: 1, revoked_at: now } : s,
  );
  file.sessions.push(row);
  await writeFile(file);
}

export async function findSessionByTokenHash(tokenHash: string): Promise<SessionRow | null> {
  const db = d1();
  if (db) {
    await ensureD1Schema(db);
    return await db
      .prepare("SELECT * FROM sessions WHERE token_hash = ?1 AND revoked = 0 LIMIT 1")
      .bind(tokenHash)
      .first<SessionRow>();
  }
  const file = await readFile();
  return file.sessions.find((s) => s.token_hash === tokenHash && s.revoked === 0) ?? null;
}

export async function touchSession(id: string): Promise<void> {
  const db = d1();
  if (db) {
    await db.prepare("UPDATE sessions SET last_active_at = datetime('now') WHERE id = ?1").bind(id).run();
    return;
  }
  const file = await readFile();
  const now = new Date().toISOString();
  file.sessions = file.sessions.map((s) => (s.id === id ? { ...s, last_active_at: now } : s));
  await writeFile(file);
}

export async function revokeSessionById(id: string): Promise<void> {
  const db = d1();
  if (db) {
    await db
      .prepare("UPDATE sessions SET revoked = 1, revoked_at = datetime('now') WHERE id = ?1")
      .bind(id)
      .run();
    return;
  }
  const file = await readFile();
  const now = new Date().toISOString();
  file.sessions = file.sessions.map((s) =>
    s.id === id ? { ...s, revoked: 1, revoked_at: now } : s,
  );
  await writeFile(file);
}

export async function listSessions(): Promise<SessionRow[]> {
  const db = d1();
  if (db) {
    await ensureD1Schema(db);
    const res = await db.prepare("SELECT * FROM sessions ORDER BY login_at DESC LIMIT 200").all<SessionRow>();
    return res.results;
  }
  const file = await readFile();
  return [...file.sessions].sort((a, b) => (a.login_at < b.login_at ? 1 : -1)).slice(0, 200);
}
