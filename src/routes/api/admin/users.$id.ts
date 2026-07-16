import { createFileRoute } from "@tanstack/react-router";
import { deleteUser, findUserById, updateUserFields, type Role, type UserStatus } from "@/lib/server/db.server";
import { jsonResponse, publicUser, requireAdmin } from "@/lib/server/session.server";

export const Route = createFileRoute("/api/admin/users/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try { await requireAdmin(); } catch (r) { return r as Response; }
        let body: { role?: Role; active?: boolean; status?: UserStatus; action?: "approve" | "reject" };
        try { body = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
        const user = await findUserById(params.id);
        if (!user) return jsonResponse({ error: "Not found" }, 404);
        const patch: { role?: Role; active?: boolean; status?: UserStatus } = {};
        if (body.action === "approve") { patch.status = "approved"; patch.active = true; }
        else if (body.action === "reject") { patch.status = "rejected"; patch.active = false; }
        else {
          if (body.role) patch.role = body.role === "Admin" ? "Admin" : "User";
          if (typeof body.active === "boolean") patch.active = body.active;
          if (body.status) patch.status = body.status;
        }
        await updateUserFields(params.id, patch);
        const updated = await findUserById(params.id);
        return jsonResponse({ user: updated ? publicUser(updated) : null });
      },
      DELETE: async ({ params }) => {
        try { await requireAdmin(); } catch (r) { return r as Response; }
        await deleteUser(params.id);
        return jsonResponse({ ok: true });
      },
    },
  },
});
