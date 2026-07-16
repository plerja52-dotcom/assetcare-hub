import { createFileRoute } from "@tanstack/react-router";
import { listSessions } from "@/lib/server/db.server";
import { jsonResponse, requireAdmin } from "@/lib/server/session.server";

export const Route = createFileRoute("/api/admin/sessions")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdmin(); } catch (r) { return r as Response; }
        const rows = await listSessions();
        return jsonResponse({
          sessions: rows.map((s) => ({
            id: s.id,
            userId: s.user_id,
            userName: s.user_name,
            loginAt: s.login_at,
            lastActiveAt: s.last_active_at,
            revoked: s.revoked === 1,
            revokedAt: s.revoked_at,
          })),
        });
      },
    },
  },
});
