// server/index-dev.ts
import type { Server } from "node:http";
import type { Express } from "express";

import fs from "node:fs/promises";
import path from "node:path";
import { createServer as createViteServer, type ViteDevServer } from "vite";

import runApp, { app, log } from "./app";

// Mount Vite correctly in middleware mode so /@vite/client works.
async function setupVite(app: Express, _server: Server) {
  const projectRoot = process.cwd();
  const configFile = path.resolve(projectRoot, "vite.config.ts");

  const vite: ViteDevServer = await createViteServer({
    configFile,
    server: {
      middlewareMode: true,
      // Disable HMR WebSocket server - can't bind to external IPs on Replit
      hmr: false,
    },
  });

  // ✅ CRITICAL: must come BEFORE any "*" catch-all
  app.use(vite.middlewares);

  // ✅ SPA HTML fallback (also must be AFTER vite.middlewares)
  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;

      const templatePath = path.resolve(root, "index.html");
      const raw = await fs.readFile(templatePath, "utf-8");

      const html = await vite.transformIndexHtml(url, raw);

      res.status(200).setHeader("Content-Type", "text/html").end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  log("vite middleware mounted (dev)", "express");
}

// runApp wires API routes first; then setupVite adds SPA handling
runApp(setupVite).catch((err) => {
  console.error(err);
  process.exit(1);
});