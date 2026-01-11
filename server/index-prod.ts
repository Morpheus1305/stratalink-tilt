// server/index-prod.ts
import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import type { Server } from "node:http";

import runApp from "./app";

/**
 * Production static serving:
 * - serves dist/public (Vite build output)
 * - SPA fallback for non-/api routes
 */
export async function serveStatic(app: Express, _server: Server) {
  // Primary location: Vite build outDir
  const publicDir = path.resolve(process.cwd(), "dist/public");
  const indexHtml = path.join(publicDir, "index.html");

  if (!fs.existsSync(indexHtml)) {
    throw new Error(
      `Could not find ${indexHtml}. Run "npm run build" before starting production.`,
    );
  }

  // Serve built assets
  app.use(express.static(publicDir));

  // SPA fallback (do not hijack /api)
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(indexHtml);
  });
}

// Boot
(async () => {
  await runApp(serveStatic);
})();