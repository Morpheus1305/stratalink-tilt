// server/index-dev.ts
import type { Express } from "express";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createServer as createViteServer } from "vite";

import runApp, { log } from "./app";

// Resolve paths (ESM-safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your Vite project root is /client
const clientRoot = path.resolve(__dirname, "..", "client");

async function setupVite(app: Express, _server: Server) {
  const vite = await createViteServer({
    root: clientRoot,
    server: { middlewareMode: true },
    appType: "custom",
  });

  // Vite dev middleware (HMR, /@vite/client, etc.)
  app.use(vite.middlewares);

  // SPA fallback: for all non-API routes, serve transformed index.html
  app.use("*", async (req, res, next) => {
    try {
      // Never intercept API routes
      if (req.originalUrl.startsWith("/api")) return next();

      const url = req.originalUrl;

      const indexPath = path.join(clientRoot, "index.html");
      const rawTemplate = fs.readFileSync(indexPath, "utf-8");

      const html = await vite.transformIndexHtml(url, rawTemplate);

      res.status(200).setHeader("Content-Type", "text/html").end(html);
    } catch (err) {
      // Better stack traces in dev
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });

  log(`vite dev middleware mounted (root=${clientRoot})`, "vite");
}

// ✅ This is the only top-level call you need:
runApp(setupVite);