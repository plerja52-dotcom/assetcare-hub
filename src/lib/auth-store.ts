import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Role = "Admin" | "User";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface StoredUser extends AuthUser {
  passwordHash: string; // simple SHA-256 hex — client-side only fallback
  salt: string;
}

// Migrate any legacy Engineer/Viewer accounts to the simplified User role.
function normalizeRole(r: unknown): Role {
  return r === "Admin" ? "Admin" : "User";
}

interface AuthState {
  currentUserId: string | null;
  users: StoredUser[];
  bootstrapped: boolean;
  setCurrent: (id: string | null) => void;
  addUser: (u: StoredUser) => void;
  updateUser: (id: string, patch: Partial<StoredUser>) => void;
  removeUser: (id: string) => void;
  markBootstrapped: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUserId: null,
      users: [],
      bootstrapped: false,
      setCurrent: (id) => set({ currentUserId: id }),
      addUser: (u) => set((s) => ({ users: [...s.users, { ...u, role: normalizeRole(u.role) }] })),
      updateUser: (id, patch) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id
              ? { ...u, ...patch, role: patch.role ? normalizeRole(patch.role) : u.role }
              : u,
          ),
        })),
      removeUser: (id) =>
        set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
      markBootstrapped: () => set({ bootstrapped: true }),
    }),
    {
      name: "rid-auth-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      // Normalize on rehydrate so old Engineer/Viewer accounts become Users.
      onRehydrateStorage: () => (state) => {
        if (state?.users) {
          state.users = state.users.map((u) => ({ ...u, role: normalizeRole(u.role) }));
        }
      },
    },
  ),
);

export async function hashPassword(pw: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${pw}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useCurrentUser(): AuthUser | null {
  const { users, currentUserId } = useAuthStore();
  if (!currentUserId) return null;
  const u = users.find((x) => x.id === currentUserId);
  if (!u || !u.active) return null;
  const { passwordHash: _p, salt: _s, ...pub } = u;
  return { ...pub, role: normalizeRole(pub.role) };
}

export function useIsAdmin(): boolean {
  const u = useCurrentUser();
  return u?.role === "Admin";
}
