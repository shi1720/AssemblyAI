import { safeReturnPath } from "@/lib/return-path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase-admin";
// Kept as an internal compatibility name. Identity is verified by Firebase,
// never by caller-supplied proxy headers.
export async function getChatGPTUser() {
  const session = (await cookies()).get("__session")?.value;
  if (!session) return null;
  try {
    const user = await adminAuth().verifySessionCookie(session, true);
    return {
      userId: user.uid,
      email: user.email || "Guest workspace",
      displayName: user.name || user.email || "Guest reviewer",
    };
  } catch {
    return null;
  }
}
export async function requireChatGPTUser(returnTo: string) {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(`/signin?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`);
}
