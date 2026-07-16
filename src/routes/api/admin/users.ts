import { createFileRoute } from "@tanstack/react-router";
import {
  findUserByEmailOrUsername,
  insertUser,
  listUsers,
  type Role,
} from "@/lib/server/db.server";
import { hashPassword, randomSalt } from "@/lib/server/hash.server";
import { jsonResponse, publicUser, requireAdmin } from "@/lib/server/session.server";

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdmin(); } catch (r) { return r as Response; }
        const rows = await listUsers();
        return jsonResponse({ users: rows.map(publicUser) });
      },
      POST: async ({ request }) => {
        try { await requireAdmin(); } catch (r) { return r as Response; }
        let body: { name?: string; username?: string; email?: string; password?: string; role?: Role };
        try { body = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
        const name = (body.name ?? "").trim();
        const username = (body.username ?? "").trim().toLowerCase();
        const email = (body.email ?? "").trim().toLowerCase();
        const password = body.password ?? "";
        const role: Role = body.role === "Admin" ? "Admin" : "User";
        if (!name || !username || !email || password.length < 8) {
          return jsonResponse({ error: "All fields + 8+ char password required" }, 400);
        }
        const clash = (await findUserByEmailOrUsername(email)) ?? (await findUserByEmailOrUsername(username));
        if (clash) return jsonResponse({ error: "Email or username already exists" }, 409);
        const salt = randomSalt();
        const password_hash = await hashPassword(password, salt);
        const row = {
          id: crypto.randomUUID(),
          name, username, email, password_hash, salt, role,
          active: 1, status: "approved" as const,
          created_at: new Date().toISOString(),
        };
        await insertUser(row);
        return jsonResponse({ user: publicUser(row) });
      },
    },
  },
});
