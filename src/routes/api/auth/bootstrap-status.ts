import { createFileRoute } from "@tanstack/react-router";
import { countUsers } from "@/lib/server/db.server";
import { jsonResponse } from "@/lib/server/session.server";

export const Route = createFileRoute("/api/auth/bootstrap-status")({
  server: {
    handlers: {
      GET: async () => {
        const c = await countUsers();
        return jsonResponse({ needsBootstrap: c === 0, userCount: c });
      },
    },
  },
});
