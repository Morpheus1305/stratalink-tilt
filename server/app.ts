import path from "path";
import { fileURLToPath } from "url";
import { type Server } from "node:http";
import path from "node:path";
import fs from "node:fs";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
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

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>
) {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ------------------------------------------------------------
  // SPA hosting for Vite build (enables direct hits to /clt/evidence)
  // IMPORTANT: this must be AFTER all /api routes are registered.
  // ------------------------------------------------------------
  const clientDist = path.resolve(process.cwd(), "client", "dist");

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));

    // SPA history fallback — serve index.html for non-API routes
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      return res.sendFile(path.join(clientDist, "index.html"));
    });

    log(`[SPA] serving static from ${clientDist}`);
  } else {
    log(
      `[SPA] client/dist not found at ${clientDist}. Build with: (cd client && npm run build)`,
      "warn"
    );
  }

  // Standardized port binding:
  // - Prefer process.env.PORT when defined (required on Replit where port 5000 is used)
  // - Fall back to 3000 for local development
  // - Bind to 0.0.0.0 for compatibility with Replit and cloud environments
  const port = Number(process.env.PORT) || 3000;
  const host = "0.0.0.0";

  // --- SPA STATIC HOSTING (Vite build) ---

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Vite outputs to client/dist/public
  const clientDistPath = path.resolve(__dirname, "../client/dist/public");

  // Serve static assets
  app.use(express.static(clientDistPath));

  // SPA fallback: any non-API route → index.html
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API route not found" });
    }

    res.sendFile(path.join(clientDistPath, "index.html"));
  });
  
  server.listen({ port, host, reusePort: true }, () => {
    log(`serving on ${host}:${port}`);
  });
}