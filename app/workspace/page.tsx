import BenchbackApp from "../benchback-app";
import { requireChatGPTUser } from "../chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Workspace() {
  return (
    <BenchbackApp user={await requireChatGPTUser("/workspace")} workspace />
  );
}
