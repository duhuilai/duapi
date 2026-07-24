import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri 2 + React + Vite. All assets are bundled locally — no CDN / external
// requests at runtime (offline requirement).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "chrome105",
    minify: "esbuild",
    sourcemap: false,
  },
});
