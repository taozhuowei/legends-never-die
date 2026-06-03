import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 2435,
    open: false,
  },
  preview: {
    host: "127.0.0.1",
    port: 2435,
    open: false,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
