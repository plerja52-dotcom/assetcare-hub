// Thin client-side session cache. The source of truth for auth is the D1
// database; this store just mirrors the current signed-in user (obtained via
// /api/auth/me) so components can react to it. Never persists to localStorage.
import { create } from "zustand";

export type Role = "Admin" | "User";
export type UserStatus = "pending" | "approved" | "rejected";

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  active: boolean;
  status: UserStatus;
  createdAt?: string;
}

export interface AdminSessionRow {
  id: string;
  userId: string;
  userName: string;
  loginAt: string;
  lastActiveAt: string;
  revoked: boolean;
  revokedAt: string | null;
}

interface SessionState {
  ready: boolean;                 // has /api/auth/me resolved at least once
  user: AuthUser | null;
  needsBootstrap: boolean | null; // null = unknown
  refresh: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T);
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body;
}

export const useSessionStore = create<SessionState>((set) => ({
  ready: false,
  user: null,
  needsBootstrap: null,
  async refresh() {
    try {
      const { user } = await fetchJson<{ user: AuthUser | null }>("/api/auth/me");
      set({ ready: true, user });
    } catch {
      set({ ready: true, user: null });
    }
  },
  async refreshBootstrap() {
    try {
      const { needsBootstrap } = await fetchJson<{ needsBootstrap: boolean }>("/api/auth/bootstrap-status");
      set({ needsBootstrap });
    } catch {
      set({ needsBootstrap: false });
    }
  },
  async signOut() {
    try { await fetchJson("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    set({ user: null });
  },
}));

// -------- login / register API wrappers --------
export async function apiLogin(identifier: string, password: string): Promise<AuthUser> {
  const { user } = await fetchJson<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  await useSessionStore.getState().refresh();
  return user;
}

export async function apiRegister(input: {
  name: string; username: string; email: string; password: string;
}): Promise<{ user: AuthUser; pending: boolean; bootstrap: boolean }> {
  const res = await fetchJson<{ user: AuthUser; pending?: boolean; bootstrap?: boolean }>(
    "/api/auth/register",
    { method: "POST", body: JSON.stringify(input) },
  );
  await useSessionStore.getState().refresh();
  await useSessionStore.getState().refreshBootstrap();
  return { user: res.user, pending: !!res.pending, bootstrap: !!res.bootstrap };
}

// -------- admin API wrappers --------
export async function apiListUsers(): Promise<AuthUser[]> {
  const { users } = await fetchJson<{ users: AuthUser[] }>("/api/admin/users");
  return users;
}
export async function apiCreateUser(input: {
  name: string; username: string; email: string; password: string; role: Role;
}): Promise<AuthUser> {
  const { user } = await fetchJson<{ user: AuthUser }>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return user;
}
export async function apiPatchUser(
  id: string,
  patch: { role?: Role; active?: boolean; status?: UserStatus; action?: "approve" | "reject" },
): Promise<AuthUser | null> {
  const { user } = await fetchJson<{ user: AuthUser | null }>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return user;
}
export async function apiDeleteUser(id: string): Promise<void> {
  await fetchJson(`/api/admin/users/${id}`, { method: "DELETE" });
}
export async function apiListSessions(): Promise<AdminSessionRow[]> {
  const { sessions } = await fetchJson<{ sessions: AdminSessionRow[] }>("/api/admin/sessions");
  return sessions;
}
export async function apiRevokeSession(id: string): Promise<void> {
  await fetchJson(`/api/admin/sessions/${id}`, { method: "DELETE" });
}

// -------- derived hooks (compat with older code) --------
export function useCurrentUser(): AuthUser | null {
  return useSessionStore((s) => s.user);
}
export function useIsAdmin(): boolean {
  return useSessionStore((s) => s.user?.role === "Admin");
}

/** True first-admin bootstrap check — hits the server. */
export function useNeedsBootstrap(): boolean | null {
  return useSessionStore((s) => s.needsBootstrap);
}

/** Idle threshold used by the admin Sessions UI. */
export const SESSION_IDLE_MS = 8 * 60 * 60 * 1000;
export function deriveSessionStatus(
  s: AdminSessionRow,
  now = Date.now(),
): "Active" | "Expired" | "Revoked" {
  if (s.revoked) return "Revoked";
  if (now - new Date(s.lastActiveAt).getTime() > SESSION_IDLE_MS) return "Expired";
  return "Active";
}
