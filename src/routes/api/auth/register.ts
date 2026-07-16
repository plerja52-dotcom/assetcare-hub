import { createFileRoute } from "@tanstack/react-router";
import { countUsers, findUserByEmailOrUsername, insertUser } from "@/lib/server/db.server";
import { hashPassword, randomSalt } from "@/lib/server/hash.server";
import { createSessionForUser, jsonResponse, publicUser } from "@/lib/server/session.server";

function usernameFromEmail(email: string): string {
  return email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, "") || "user";
}

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { name?: string; username?: string; email?: string; password?: string };
        try { body = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
        const name = (body.name ?? "").trim();
        const email = (body.email ?? "").trim().toLowerCase();
        const username = ((body.username ?? "").trim() || usernameFromEmail(email)).toLowerCase();
        const password = body.password ?? "";
        if (!name || !email || !username || password.length < 8) {
          return jsonResponse({ error: "Name, email, username and 8+ char password required" }, 400);
        }
        if (!/^[a-z0-9._-]{2,}$/.test(username)) {
          return jsonResponse({ error: "Username must be 2+ chars: a-z 0-9 . _ -" }, 400);
        }
        const existing = await findUserByEmailOrUsername(email) ?? await findUserByEmailOrUsername(username);
        if (existing) return jsonResponse({ error: "An account with that email or username already exists" }, 409);

        const isBootstrap = (await countUsers()) === 0;
        const salt = randomSalt();
        const passwordHash = await hashPassword(password, salt);
        const row = {
          id: crypto.randomUUID(),
          name,
          username,
          email,
          password_hash: passwordHash,
          salt,
          role: isBootstrap ? ("Admin" as const) : ("User" as const),
          active: isBootstrap ? 1 : 0,
          status: isBootstrap ? ("approved" as const) : ("pending" as const),
          created_at: new Date().toISOString(),
        };
        await insertUser(row);

        if (isBootstrap) {
          await createSessionForUser(row);
          return jsonResponse({ user: publicUser(row), bootstrap: true });
        }
        // Non-bootstrap: pending approval — no session issued.
        return jsonResponse({ user: publicUser(row), pending: true });
      },
    },
  },
});
