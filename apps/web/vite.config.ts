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
        enabled: true,
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
