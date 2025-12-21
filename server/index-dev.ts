import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import { nanoid } from "nanoid";
import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";

import viteConfig from "../vite.config";
import runApp from "./app";

/**
 * ----------------------------------------------------------------------------
 * DEV ENTRYPOINT (Vite + Express)
 *
 * IMPORTANT:
 * - This file must only start the app ONCE per process.
 * - Replit may auto-start the server; ingestion loops keep it alive.
 * - We guard against double execution to prevent EADDRINUSE on port 5000.
 * ----------------------------------------------------------------------------
 */

export async function setupVite(app: Express, server: Server) {
  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );

      // Always reload index.html from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      template = template.replace(
        'src="/src/main.tsx"',
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * ----------------------------------------------------------------------------
 * SAFE APP BOOTSTRAP
 *
 * Prevents double-listen when Replit auto-runs + manual `npm run dev`
 * ----------------------------------------------------------------------------
 */
(async () => {
  if ((global as any).__APP_STARTED__) {
    console.log("[DEV] App already running — skipping duplicate startup");
    return;
  }

  (global as any).__APP_STARTED__ = true;

  await runApp(setupVite);
})();