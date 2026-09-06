import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

const APP_VERSION = "2.7"
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
        runtimeCaching: [
          {
            // Match any request sent to Cloudinary
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 100, // Maximum number of images to keep in cache
                maxAgeSeconds: 30 * 24 * 60 * 60, // 7 days (604,800 seconds)
              },
              cacheableResponse: {
                statuses: [0, 200], // 0 handles opaque cross-origin responses
              },
            },
          },
        ],
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
