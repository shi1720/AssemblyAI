export function trustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = (
    process.env.APP_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
  ).split(",");
  return allowed.includes(origin);
}
export const SESSION_SECONDS = 60 * 60 * 24 * 5;
