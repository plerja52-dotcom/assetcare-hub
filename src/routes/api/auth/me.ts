import { createFileRoute } from "@tanstack/react-router";
import { getSessionContext, jsonResponse, publicUser } from "@/lib/server/session.server";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async () => {
        const ctx = await getSessionContext();
        if (!ctx) return jsonResponse({ user: null });
        return jsonResponse({ user: publicUser(ctx.user), sessionId: ctx.sessionId });
      },
    },
  },
});
