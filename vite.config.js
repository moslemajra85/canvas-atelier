import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    port: 4173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@codemirror") || id.includes("node_modules/@lezer")) {
            return "editor-vendor";
          }
        }
      }
    }
  }
});
