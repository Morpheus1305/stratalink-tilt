// server/app.ts
import { type Server } from "node:http";
import fs from "node:fs";
import path from "node:path";

import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { registerRoutes } from "./routes";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Preserve raw body (useful for webhooks/signatures)
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

// Lightweight API logging (only for /api)
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 180) {
        logLine = logLine.slice(0, 179) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * Serve built Vite client from dist/public (SPA fallback for Wouter).
 * Safe:
 *  - will NOT override /api/*
 *  - only activates when dist/public/index.html exists
 */
function maybeServeClient(app: Express) {
  const publicDir = path.resolve("dist/public");
  const indexFile = path.join(publicDir, "index.html");

  if (!fs.existsSync(indexFile)) {
    log(`client not mounted (missing ${indexFile})`, "express");
    return;
  }

  // Static assets: /assets/*, /logo.png, etc.
  app.use(express.static(publicDir));

  // SPA fallback — only for non-API routes
  // This ensures deep links like /clt/evidence render the React app.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(indexFile);
  });

  log(`client mounted from ${publicDir}`, "express");
}

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>
) {
  const server = await registerRoutes(app);

  // App error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // IMPORTANT: run setup AFTER routes (so SPA catch-all won’t eat /api routes)
  await setup(app, server);

  // Auto-mount built client if present
  maybeServeClient(app);

  // Standardized port binding:
  // - Prefer process.env.PORT (Replit)
  // - Fall back to 3000 for local dev
  const port = Number(process.env.PORT) || 3000;
  const host = "0.0.0.0";

  server.listen({ port, host, reusePort: true }, () => {
    log(`serving on ${host}:${port}`);
  });
}