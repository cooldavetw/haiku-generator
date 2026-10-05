import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// FastAPI serves the build under whatever prefix the app is mounted at, so
// every URL in it must be relative. The dev server proxies the API to FastAPI.
const api = process.env.API_URL || "http://127.0.0.1:8000";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    proxy: { "/agent": api, "/health": api },
  },
});
