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
      manifest: {
        background_color: defaultThemeColor,
        description:
          "TuneTrack is a mobile-friendly party game room for building music timelines together.",
        display: "standalone",
        icons: [
          {
            purpose: "any",
            sizes: "192x192",
            src: "/pwa-192.svg",
            type: "image/svg+xml",
          },
          {
            purpose: "any maskable",
            sizes: "512x512",
            src: "/pwa-512.svg",
            type: "image/svg+xml",
          },
        ],
        lang: "en",
        name: "TuneTrack Beats",
        orientation: "any",
        short_name: "TuneTrack",
        start_url: "/",
        theme_color: defaultThemeColor,
      },
    }),
  ],
  server: {
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
