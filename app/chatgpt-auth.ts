import { headers } from "next/headers";
import { redirect } from "next/navigation";
export async function getChatGPTUser() {
  const h = await headers();
  const userId = h.get("oai-authenticated-user-id");
  const email = h.get("oai-authenticated-user-email");
  if (!userId || !email) return null;
  let fullName = h.get("oai-authenticated-user-full-name");
  if (
    fullName &&
    h.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
  ) {
    try {
      fullName = decodeURIComponent(fullName);
    } catch {
      fullName = null;
    }
  }
  return { userId, email, displayName: fullName || email };
}
export async function requireChatGPTUser(returnTo: string) {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(
    `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/")}`,
  );
}
