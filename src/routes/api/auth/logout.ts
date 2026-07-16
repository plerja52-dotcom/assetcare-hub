import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie, jsonResponse } from "@/lib/server/session.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        await clearSessionCookie();
        return jsonResponse({ ok: true });
      },
    },
  },
});
