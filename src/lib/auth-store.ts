import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

export interface StoredUser extends AuthUser {
  passwordHash: string;
  salt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  userName: string;
  loginAt: string;      // ISO
  lastActiveAt: string; // ISO
  revoked?: boolean;
  revokedAt?: string;
}

/** A session is considered Expired if it was not touched within this window. */
export const SESSION_IDLE_MS = 8 * 60 * 60 * 1000; // 8h

export function deriveSessionStatus(
  s: SessionRecord,
  now = Date.now(),
): "Active" | "Expired" | "Revoked" {
  if (s.revoked) return "Revoked";
  if (now - new Date(s.lastActiveAt).getTime() > SESSION_IDLE_MS) return "Expired";
  return "Active";
}

function normalizeRole(r: unknown): Role {
  return r === "Admin" ? "Admin" : "User";
}
function normalizeStatus(s: unknown): UserStatus {
  return s === "pending" || s === "rejected" ? s : "approved";
}
function usernameFromEmail(email: string): string {
  return email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, "") || "user";
}

interface AuthState {
  currentUserId: string | null;
  currentSessionId: string | null;
  users: StoredUser[];
  sessions: SessionRecord[];
  setCurrent: (id: string | null) => void;
  addUser: (u: StoredUser) => void;
  updateUser: (id: string, patch: Partial<StoredUser>) => void;
  removeUser: (id: string) => void;
  approveUser: (id: string) => void;
  rejectUser: (id: string) => void;
  /** Create session and mark ALL prior non-revoked sessions for this user as revoked. */
  loginSession: (userId: string, userName: string) => string;
  touchCurrentSession: () => void;
  revokeSession: (id: string) => void;
  /** Sign out: revoke the current session and clear current user. */
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      currentSessionId: null,
      users: [],
      sessions: [],
      setCurrent: (id) => set({ currentUserId: id }),
      addUser: (u) =>
        set((s) => ({
          users: [
            ...s.users,
            {
              ...u,
              username: (u.username || usernameFromEmail(u.email)).toLowerCase(),
              role: normalizeRole(u.role),
              status: normalizeStatus(u.status),
              createdAt: u.createdAt ?? new Date().toISOString(),
            },
          ],
        })),
      updateUser: (id, patch) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id
              ? {
                  ...u,
                  ...patch,
                  username: patch.username ? patch.username.toLowerCase() : u.username,
                  role: patch.role ? normalizeRole(patch.role) : u.role,
                  status: patch.status ? normalizeStatus(patch.status) : u.status,
                }
              : u,
          ),
        })),
      removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
      approveUser: (id) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id ? { ...u, status: "approved", active: true } : u,
          ),
        })),
      rejectUser: (id) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id ? { ...u, status: "rejected", active: false } : u,
          ),
        })),
      loginSession: (userId, userName) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        set((s) => ({
          currentUserId: userId,
          currentSessionId: id,
          sessions: [
            { id, userId, userName, loginAt: now, lastActiveAt: now },
            // Revoke every prior non-revoked session for this user.
            ...s.sessions.map((x) =>
              x.userId === userId && !x.revoked
                ? { ...x, revoked: true, revokedAt: now }
                : x,
            ),
          ].slice(0, 200),
        }));
        return id;
      },
      touchCurrentSession: () => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        const now = new Date().toISOString();
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === currentSessionId ? { ...x, lastActiveAt: now } : x,
          ),
        }));
      },
      revokeSession: (id) => {
        const now = new Date().toISOString();
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id ? { ...x, revoked: true, revokedAt: now } : x,
          ),
          // If revoking my own session, sign me out.
          ...(s.currentSessionId === id
            ? { currentUserId: null, currentSessionId: null }
            : {}),
        }));
      },
      signOut: () => {
        const { currentSessionId } = get();
        const now = new Date().toISOString();
        set((s) => ({
          currentUserId: null,
          currentSessionId: null,
          sessions: currentSessionId
            ? s.sessions.map((x) =>
                x.id === currentSessionId ? { ...x, revoked: true, revokedAt: now } : x,
              )
            : s.sessions,
        }));
      },
    }),
    {
      name: "rid-auth-v3",
      version: 3,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      migrate: (persisted, _v) => {
        const p = persisted as {
          users?: StoredUser[];
          currentUserId?: string | null;
          currentSessionId?: string | null;
          sessions?: SessionRecord[];
        } | undefined;
        return {
          currentUserId: p?.currentUserId ?? null,
          currentSessionId: p?.currentSessionId ?? null,
          sessions: p?.sessions ?? [],
          users: (p?.users ?? []).map((u) => ({
            ...u,
            username: (u.username || usernameFromEmail(u.email)).toLowerCase(),
            role: normalizeRole(u.role),
            status: normalizeStatus((u as unknown as { status?: unknown }).status),
            createdAt: u.createdAt ?? new Date().toISOString(),
          })),
        };
      },
    },
  ),
);

export async function hashPassword(pw: string, salt: string, iterations = 120000): Promise<string> {
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

export function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Find user by email or username (single input). */
export function findUserByIdentifier(users: StoredUser[], identifier: string): StoredUser | undefined {
  const id = identifier.trim().toLowerCase();
  if (!id) return undefined;
  if (id.includes("@")) return users.find((u) => u.email.toLowerCase() === id);
  return users.find((u) => u.username.toLowerCase() === id);
}

export function useCurrentUser(): AuthUser | null {
  const { users, currentUserId } = useAuthStore();
  if (!currentUserId) return null;
  const u = users.find((x) => x.id === currentUserId);
  if (!u || !u.active || u.status !== "approved") return null;
  const { passwordHash: _p, salt: _s, ...pub } = u;
  return pub;
}

export function useIsAdmin(): boolean {
  return useCurrentUser()?.role === "Admin";
}

/** True first-admin bootstrap check: based on user count, not a flag. */
export function useNeedsBootstrap(): boolean {
  return useAuthStore((s) => s.users.length === 0);
}
