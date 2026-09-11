import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);
export default defineConfig({
  base: "./",
  define: { __GAME_VERSION__: JSON.stringify(version) },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: { game: "index.html", art: "asset-gallery.html" },
      output: {
        manualChunks: (id: string) =>
          id.includes("node_modules/three/") ? "three" : undefined,
      },
    },
  },
});
