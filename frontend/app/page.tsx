import HaikuApp from "@/components/haiku-app";
import { getBackendStatus } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <HaikuApp status={await getBackendStatus()} />;
}
