import { createFileRoute } from "@tanstack/react-router";
import { revokeSessionById } from "@/lib/server/db.server";
import { jsonResponse, requireAdmin } from "@/lib/server/session.server";

export const Route = createFileRoute("/api/admin/sessions/$id")({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        try { await requireAdmin(); } catch (r) { return r as Response; }
        await revokeSessionById(params.id);
        return jsonResponse({ ok: true });
      },
    },
  },
});
