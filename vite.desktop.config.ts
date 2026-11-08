import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist-desktop",
    rollupOptions: {
      input: fileURLToPath(new URL("./desktop.html", import.meta.url)),
    },
  },
});
