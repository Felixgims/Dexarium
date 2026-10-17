import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: process.env.BASE_PATH || "/Dexarium/",
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "art/*.webp", "*.txt"],
      manifest: {
        name: "Dexarium",
        short_name: "Dexarium",
        description: "Tu colección Pokémon, siempre contigo",
        theme_color: "#101f25",
        background_color: "#101f25",
        display: "standalone",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,webp,svg,json}"],
        maximumFileSizeToCacheInBytes: 6000000,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
