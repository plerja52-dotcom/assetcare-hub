import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Role = "Admin" | "User";
export type UserStatus = "pending" | "approved" | "rejected";

export interface AuthUser {
  id: string;
  name: string;
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
}

function normalizeRole(r: unknown): Role {
  return r === "Admin" ? "Admin" : "User";
}
function normalizeStatus(s: unknown): UserStatus {
  return s === "pending" || s === "rejected" ? s : "approved";
}

interface AuthState {
  currentUserId: string | null;
  users: StoredUser[];
  sessions: SessionRecord[];
  setCurrent: (id: string | null) => void;
  addUser: (u: StoredUser) => void;
  updateUser: (id: string, patch: Partial<StoredUser>) => void;
  removeUser: (id: string) => void;
  approveUser: (id: string) => void;
  rejectUser: (id: string) => void;
  addSession: (s: SessionRecord) => void;
  touchSession: (id: string) => void;
  revokeSession: (id: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUserId: null,
      users: [],
      sessions: [],
      setCurrent: (id) => set({ currentUserId: id }),
      addUser: (u) =>
        set((s) => ({
          users: [
            ...s.users,
            {
              ...u,
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
      addSession: (sr) => set((s) => ({ sessions: [sr, ...s.sessions].slice(0, 100) })),
      touchSession: (id) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id ? { ...x, lastActiveAt: new Date().toISOString() } : x,
          ),
        })),
      revokeSession: (id) =>
        set((s) => ({
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, revoked: true } : x)),
        })),
    }),
    {
      name: "rid-auth-v2",
      version: 2,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      migrate: (persisted, _v) => {
        // v1 → v2: add status field, drop legacy `bootstrapped` flag.
        const p = persisted as { users?: StoredUser[]; currentUserId?: string | null; sessions?: SessionRecord[] } | undefined;
        return {
          currentUserId: p?.currentUserId ?? null,
          sessions: p?.sessions ?? [],
          users: (p?.users ?? []).map((u) => ({
            ...u,
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
  // PBKDF2-SHA256, browser + Cloudflare Worker friendly.
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
