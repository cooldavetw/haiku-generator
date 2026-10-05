export type BackendStatus = "ready" | "unconfigured" | "unavailable";

export function getAgentUrl(): string {
  return process.env.AGENT_URL || "http://127.0.0.1:8000/agent";
}

export async function getBackendStatus(): Promise<BackendStatus> {
  try {
    const response = await fetch(new URL("health", getAgentUrl()), {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return "unavailable";
    const health = await response.json();
    if (health?.status !== "ok" || typeof health.configured !== "boolean") return "unavailable";
    return health.configured ? "ready" : "unconfigured";
  } catch {
    return "unavailable";
  }
}
