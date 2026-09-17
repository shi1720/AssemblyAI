import BenchbackApp from "./benchback-app";
import { getChatGPTUser } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <BenchbackApp user={await getChatGPTUser()} />;
}
