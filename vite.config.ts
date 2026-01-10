// vite.config.ts (project root)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  const replitHost =
    process.env.REPLIT_DEV_DOMAIN ||
    (process.env.REPLIT_DOMAINS?.split(",")?.[0] ?? undefined) ||
    (process.env.REPL_SLUG && process.env.REPL_OWNER
      ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : undefined);

  const replitPlugins =
    process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          (await import("@replit/vite-plugin-cartographer")).cartographer(),
          (await import("@replit/vite-plugin-dev-banner")).devBanner(),
        ]
      : [];

  return {
    plugins: [react(), runtimeErrorOverlay(), ...replitPlugins],

    root: path.resolve(import.meta.dirname, "client"),

    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },

    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },

    server: {
      host: true,

      allowedHosts: [
        "localhost",
        ".replit.dev",
        ".janeway.replit.dev",
        ".replit.app",
        ...(replitHost ? [replitHost] : []),
      ],

      // This is fine to keep; in dev middleware mode we also attach HMR to Express server.
      hmr:
        process.env.REPL_ID !== undefined && replitHost
          ? { protocol: "wss", host: replitHost, clientPort: 443 }
          : undefined,

      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});