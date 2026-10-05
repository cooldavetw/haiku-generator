import { defineConfig } from "@playwright/test";

// FastAPI serves the built frontend, as in the Segma container. Run
// `npm run build` first; each service is one Uvicorn process.
const python = ".venv/bin/python -m uvicorn --app-dir tests/backend --host 127.0.0.1";

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:8100", browserName: "chromium", trace: "retain-on-failure" },
  webServer: [
    {
      command: `${python} --port 8100 mock_service:app`,
      cwd: "..",
      url: "http://127.0.0.1:8100/health",
      env: { OPENAI_API_KEY: "test-key-never-sent-to-provider" },
    },
    {
      command: `${python} --port 8101 main:app`,
      cwd: "..",
      url: "http://127.0.0.1:8101/health",
      env: { OPENAI_API_KEY: "" },
    },
    {
      command: `${python} --port 8102 prefixed_service:app`,
      cwd: "..",
      url: "http://127.0.0.1:8102/fastapi-prod/7/api/health",
      env: { OPENAI_API_KEY: "test-key-never-sent-to-provider" },
    },
  ],
});
