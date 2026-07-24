import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { darkThemeDefinition } from "./src/features/theme/darkThemeTokens";

const defaultThemeColor = darkThemeDefinition.cssVariables["color-bg-app"] as string;

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      injectRegister: "auto",
      registerType: "autoUpdate",
      devOptions: {
        // Self-signed HTTPS (basicSsl) breaks SW registration in Chrome; keep PWA for prod builds.
        enabled: false,
      },
      manifest: {
        id: "tunetrack-beats",
        name: "TuneTrack Beats",
        short_name: "TuneTrack",
        description:
          "TuneTrack is a mobile-friendly party game room for building music timelines together.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: defaultThemeColor,
        theme_color: defaultThemeColor,
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split third-party libs into stable, independently cacheable chunks so an
        // app-code change no longer invalidates React/framer-motion for PWA updates.
        // Libs used only by lazy routes (dnd-kit, tanstack, socket.io) stay deferred.
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("@dnd-kit")) {
            return "vendor-dnd";
          }
          if (id.includes("@tanstack")) {
            return "vendor-tanstack";
          }
          if (id.includes("socket.io") || id.includes("engine.io")) {
            return "vendor-socket";
          }
          if (id.includes("zod")) {
            return "vendor-zod";
          }
          if (id.includes("react-router") || id.includes("@remix-run")) {
            return "vendor-router";
          }
          if (id.includes("react-dom")) {
            return "vendor-react-dom";
          }
          if (id.includes("/react/") || id.includes("react/jsx-runtime") || id.includes("scheduler")) {
            return "vendor-react";
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    // Bind on all interfaces so phones on the same Wi‑Fi can reach the app.
    // (npm often swallows CLI `--host` before Vite sees it.)
    host: true,
    port: 5173,
    proxy: {
      // Forward socket.io traffic to the HTTP server so HTTPS pages avoid mixed-content
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
