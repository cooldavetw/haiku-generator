import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3100", browserName: "chromium", trace: "retain-on-failure" },
  webServer: [
    {
      command: ".venv/bin/python -m uvicorn mock_service:app --app-dir tests/backend --host 127.0.0.1 --port 8100",
      cwd: "..",
      url: "http://127.0.0.1:8100/health",
      env: { OPENAI_API_KEY: "test-key-never-sent-to-provider" },
    },
    {
      command: ".venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8101",
      cwd: "..",
      url: "http://127.0.0.1:8101/health",
      env: { OPENAI_API_KEY: "" },
    },
    {
      command: "npm start -- --port 3100",
      url: "http://127.0.0.1:3100",
      env: { OPENAI_API_KEY: "", AGENT_URL: "http://127.0.0.1:8100/agent" },
    },
    {
      command: "npm start -- --port 3101",
      url: "http://127.0.0.1:3101",
      env: { OPENAI_API_KEY: "", AGENT_URL: "http://127.0.0.1:8101/agent" },
    },
  ],
});
