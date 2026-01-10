// server/index-dev.ts
import type { Server } from "node:http";
import type { Express } from "express";

import fs from "node:fs/promises";
import path from "node:path";
import { createServer as createViteServer, type ViteDevServer } from "vite";

import runApp, { app, log } from "./app";

// Mount Vite correctly in middleware mode so /@vite/client works.
async function setupVite(app: Express, _server: Server) {
  const root = path.resolve(process.cwd(), "client");
  const projectRoot = process.cwd();

  const vite: ViteDevServer = await createViteServer({
    root,
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "client", "src"),
        "@shared": path.resolve(projectRoot, "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },
    server: {
      middlewareMode: true,
      host: true,
      allowedHosts: [
        ".replit.dev",
        ".janeway.replit.dev",
        ".replit.app",
        "localhost",
      ],
    },
    appType: "spa",
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