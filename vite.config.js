import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

const APP_VERSION = "2.6"
// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",

      workbox: {
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
      manifest: {
        name: "TicketMaster",
        short_name: "TicketMaster",
        version: APP_VERSION,
        start_url: "/",
        display: "standalone",
        theme_color: "#121212",
        background_color: "#ffffff",
        icons: [
          {
            src: "/ticketmaster.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/ticketmaster.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  build: {
    outDir: "dist", // Ensure Vite outputs to 'dist'
  },
});
