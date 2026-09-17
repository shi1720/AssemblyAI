import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ApiError } from "./api-error";
import { trustedOrigin } from "./auth-security";
export { ApiError } from "./api-error";
export {
  getCore,
  getCores,
  getPolicies,
  saveAction,
  quota,
  releaseQuota,
  creditSourceKey,
} from "./database";
export async function owner() {
  const u = await getChatGPTUser();
  if (!u) throw new ApiError(401, "Sign in to access your private workspace.");
  return u;
}
export function sameOrigin(request: Request) {
  if (!trustedOrigin(request))
    throw new ApiError(
      403,
      "This action must originate from the Benchback app.",
    );
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new ApiError(415, "Use application/json for this request.");
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length")) > 600000)
    throw new ApiError(413, "Request is too large.");
  const text = await request.text();
  if (text.length > 600000) throw new ApiError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Invalid JSON.");
  }
}
