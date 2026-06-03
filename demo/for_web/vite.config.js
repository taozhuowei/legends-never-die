import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const projectRoot = path.resolve(__dirname, "..");
const staticRoot = path.join(projectRoot, "static");

function serveStaticMount(mountPath, dirName, mimeTypes) {
  const targetRoot = path.join(staticRoot, dirName);

  return {
    name: `serve-${dirName}`,
    configureServer(server) {
      server.middlewares.use(mountPath, (req, res, next) => {
        const requestUrl = new URL(req.url ?? "/", "http://localhost");
        const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
        const assetPath = path.join(targetRoot, relativePath);

        if (!assetPath.startsWith(targetRoot) || !fs.existsSync(assetPath)) {
          next();
          return;
        }

        const extension = path.extname(assetPath).toLowerCase();
        res.setHeader("Content-Type", mimeTypes[extension] ?? "application/octet-stream");
        fs.createReadStream(assetPath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 4173,
    open: false,
    fs: {
      strict: false,
      allow: [projectRoot],
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    open: false,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  publicDir: false,
  plugins: [
    serveStaticMount("/images", "images", {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    }),
    serveStaticMount("/audio", "audio", {
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
      ".ogg": "audio/ogg",
      ".m4a": "audio/mp4",
    }),
  ],
});
