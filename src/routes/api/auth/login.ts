import { createFileRoute } from "@tanstack/react-router";
import { findUserByEmailOrUsername } from "@/lib/server/db.server";
import { verifyPassword } from "@/lib/server/hash.server";
import { createSessionForUser, jsonResponse, publicUser } from "@/lib/server/session.server";

// Very small in-memory throttle. Real KV-based limiter will land in Part D.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX = 8;

function throttle(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX;
}

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { identifier?: string; password?: string };
        try { body = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
        const identifier = (body.identifier ?? "").trim();
        const password = body.password ?? "";
        if (!identifier || !password) return jsonResponse({ error: "Missing credentials" }, 400);
        if (!throttle(identifier.toLowerCase())) return jsonResponse({ error: "Too many attempts. Try again shortly." }, 429);

        const user = await findUserByEmailOrUsername(identifier);
        if (!user) return jsonResponse({ error: "Invalid credentials" }, 401);
        if (user.status === "pending") return jsonResponse({ error: "Your account is awaiting Admin approval." }, 403);
        if (user.status === "rejected" || user.active !== 1) {
          return jsonResponse({ error: "Your account is not approved. Contact your Admin." }, 403);
        }
        const ok = await verifyPassword(password, user.salt, user.password_hash);
        if (!ok) return jsonResponse({ error: "Invalid credentials" }, 401);

        await createSessionForUser(user);
        return jsonResponse({ user: publicUser(user) });
      },
    },
  },
});
