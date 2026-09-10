import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("node_modules/three/") ? "three" : undefined,
      },
    },
  },
});
