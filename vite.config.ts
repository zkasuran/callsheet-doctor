import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The React SPA is served from Convex static hosting at https://<deployment>.convex.site
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist" },
});
