import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    "/*": index,
    "/api/health": {
      GET() {
        return Response.json({ ok: true, app: "candychart" });
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`CandyChart sunucusu çalışıyor: ${server.url}`);
