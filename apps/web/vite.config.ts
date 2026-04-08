import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: "auto",
      registerType: "autoUpdate",
      manifest: {
        background_color: "#071018",
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
        theme_color: "#071018",
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
