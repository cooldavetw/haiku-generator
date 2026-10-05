import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { getAgentUrl, getBackendStatus } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let handler: ReturnType<typeof createCopilotRuntimeHandler> | undefined;

async function handle(request: Request) {
  const status = await getBackendStatus();
  if (status !== "ready") {
    const error = status === "unconfigured"
      ? "Set OPENAI_API_KEY in the repository root .env.local and restart FastAPI."
      : "The FastAPI service is unavailable. Start python main.py and check AGENT_URL.";
    return Response.json({ error }, { status: 503 });
  }
  handler ??= createCopilotRuntimeHandler({
    runtime: new CopilotRuntime({
      agents: {
        tool_based_generative_ui: new HttpAgent({
          url: getAgentUrl(),
        }),
      },
    }),
    basePath: "/api/copilotkit",
  });
  return handler(request);
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
