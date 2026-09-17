export function safeReturnPath(
  candidate: string | null | undefined,
  fallback = "/workspace",
) {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(candidate)
  )
    return fallback;
  try {
    const url = new URL(candidate, "https://benchback.invalid");
    return url.origin === "https://benchback.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
