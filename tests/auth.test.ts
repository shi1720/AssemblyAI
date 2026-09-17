import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  createSessionCookie: vi.fn(),
  verifySessionCookie: vi.fn(),
  cookie: undefined as string | undefined,
  redirect: vi.fn((path: string): never => {
    throw new Error("REDIRECT:" + path);
  }),
}));
vi.mock("../lib/firebase-admin", () => ({ adminAuth: () => mocks }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      key === "__session" && mocks.cookie ? { value: mocks.cookie } : undefined,
  }),
  // Spoofed Sites headers must never become the identity in Firebase deployment.
  headers: async () =>
    new Headers({
      "oai-authenticated-user-id": "spoofed-owner",
      "oai-authenticated-user-email": "attacker@example.test",
    }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { POST as session } from "../app/api/auth/session/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { getChatGPTUser, requireChatGPTUser } from "../app/chatgpt-auth";
import { safeReturnPath } from "../lib/return-path";
import { SESSION_SECONDS } from "../lib/auth-security";
function request(
  payload: unknown = { idToken: "signed-firebase-token" },
  origin: string | null = "https://benchback.test",
  extra: Record<string, string> = {},
) {
  return new Request("http://cloud-run-internal:8080/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
      ...extra,
    },
    body: JSON.stringify(payload),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_ORIGINS", "https://benchback.test");
  vi.stubEnv("NODE_ENV", "production");
  mocks.cookie = undefined;
  mocks.verifyIdToken.mockResolvedValue({
    uid: "verified-owner",
    auth_time: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    firebase: { sign_in_provider: "password" },
  });
  mocks.createSessionCookie.mockResolvedValue("signed-session-cookie");
  mocks.verifySessionCookie.mockResolvedValue({
    uid: "verified-owner",
    email: "owner@example.test",
    name: "Verified owner",
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("Firebase session security", () => {
  it("rejects missing, unrelated, and lookalike origins before token verification", async () => {
    for (const origin of [
      null,
      "null",
      "https://other.test",
      "https://benchback.test.evil.test",
    ]) {
      expect((await session(request(undefined, origin))).status).toBe(403);
      expect((await logout(request(undefined, origin))).status).toBe(403);
    }
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });
  it("accepts a verified fresh token through the trusted Firebase hosting origin", async () => {
    const response = await session(request());
    expect(response.status).toBe(200);
    expect(mocks.verifyIdToken).toHaveBeenCalledWith(
      "signed-firebase-token",
      true,
    );
    expect(mocks.createSessionCookie).toHaveBeenCalledWith(
      "signed-firebase-token",
      { expiresIn: SESSION_SECONDS * 1000 },
    );
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const cookie = response.headers.get("Set-Cookie")!;
    expect(cookie).toContain("__session=signed-session-cookie");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain(`Max-Age=${SESSION_SECONDS}`);
  });
  it("rejects expired authentication and invalid or revoked ID tokens", async () => {
    mocks.verifyIdToken.mockResolvedValue({
      uid: "user",
      auth_time: Math.floor(Date.now() / 1000) - 301,
    });
    expect((await session(request())).status).toBe(401);
    mocks.verifyIdToken.mockRejectedValue(new Error("revoked-token-detail"));
    const response = await session(request());
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain("revoked-token-detail");
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });
  it("rejects malformed and oversized token requests without calling Firebase", async () => {
    for (const payload of [
      {},
      { idToken: 123 },
      { idToken: "x".repeat(12001) },
    ])
      expect((await session(request(payload))).status).toBe(401);
    expect(
      (
        await session(
          request({}, "https://benchback.test", { "Content-Length": "13000" }),
        )
      ).status,
    ).toBe(401);
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
  });
  it("ignores forged identity headers and trusts only verified session claims", async () => {
    expect(await getChatGPTUser()).toBeNull();
    expect(mocks.verifySessionCookie).not.toHaveBeenCalled();
    mocks.cookie = "signed-cookie";
    expect(await getChatGPTUser()).toEqual({
      userId: "verified-owner",
      email: "owner@example.test",
      displayName: "Verified owner",
    });
    expect(mocks.verifySessionCookie).toHaveBeenCalledWith(
      "signed-cookie",
      true,
    );
  });
  it("fails closed for expired, revoked, or invalid session cookies", async () => {
    mocks.cookie = "invalid-cookie";
    mocks.verifySessionCookie.mockRejectedValue(new Error("invalid signature"));
    expect(await getChatGPTUser()).toBeNull();
    await expect(requireChatGPTUser("/workspace")).rejects.toThrow(
      "REDIRECT:/signin?return_to=%2Fworkspace",
    );
  });
  it("clears the Firebase forwarded session cookie on same-origin logout", async () => {
    const response = await logout(request());
    expect(response.status).toBe(200);
    const cookie = response.headers.get("Set-Cookie")!;
    expect(cookie).toContain("__session=;");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("rejects missing, nonfinite, and excessively future authentication timestamps", async () => {
    for (const auth_time of [
      undefined,
      NaN,
      Infinity,
      "123",
      Math.floor(Date.now() / 1000) + 120,
    ]) {
      mocks.verifyIdToken.mockResolvedValue({
        uid: "user",
        auth_time,
        firebase: { sign_in_provider: "password" },
      });
      expect((await session(request())).status).toBe(401);
    }
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });
  it("lets returning anonymous guests preserve their workspace only with a freshly issued verified token", async () => {
    const now = Math.floor(Date.now() / 1000);
    mocks.verifyIdToken.mockResolvedValue({
      uid: "same-guest",
      auth_time: now - 86400,
      iat: now,
      firebase: { sign_in_provider: "anonymous" },
    });
    expect((await session(request())).status).toBe(200);
    mocks.verifyIdToken.mockResolvedValue({
      uid: "same-guest",
      auth_time: now - 86400,
      iat: now - 301,
      firebase: { sign_in_provider: "anonymous" },
    });
    expect((await session(request())).status).toBe(401);
    mocks.verifyIdToken.mockResolvedValue({
      uid: "email-user",
      auth_time: now - 86400,
      iat: now,
      firebase: { sign_in_provider: "password" },
    });
    expect((await session(request())).status).toBe(401);
    expect(mocks.createSessionCookie).toHaveBeenCalledTimes(1);
  });
  it("keeps post-login redirects within the app, including browser backslash normalization", async () => {
    for (const path of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/\n/evil.test",
      "javascript:alert(1)",
      "",
    ])
      expect(safeReturnPath(path)).toBe("/workspace");
    expect(safeReturnPath("/workspace?tab=credits#ledger")).toBe(
      "/workspace?tab=credits#ledger",
    );
    await expect(requireChatGPTUser("/\\evil.test")).rejects.toThrow(
      "REDIRECT:/signin?return_to=%2Fworkspace",
    );
  });
});
