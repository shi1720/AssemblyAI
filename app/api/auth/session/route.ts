import { adminAuth } from "@/lib/firebase-admin";
import { trustedOrigin, SESSION_SECONDS } from "@/lib/auth-security";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
  if (!trustedOrigin(request))
    return NextResponse.json(
      { error: "This sign-in request came from an unrecognized origin." },
      { status: 403 },
    );
  try {
    if (Number(request.headers.get("content-length") || 0) > 12000)
      throw new Error("oversized");
    const raw = await request.text();
    if (raw.length > 12000) throw new Error("oversized");
    const { idToken } = JSON.parse(raw);
    if (typeof idToken !== "string" || idToken.length > 10000)
      throw new Error("invalid");
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    const now = Date.now() / 1000;
    const anonymous = decoded.firebase?.sign_in_provider === "anonymous";
    // Returning guests keep their UID. Only a freshly issued, verified token
    // may establish a session; password users must freshly authenticate.
    const authenticatedAt = anonymous ? decoded.iat : decoded.auth_time;
    if (
      !Number.isFinite(authenticatedAt) ||
      authenticatedAt > now + 60 ||
      now - authenticatedAt > 300
    )
      return NextResponse.json(
        { error: "Please sign in again to create a fresh session." },
        { status: 401 },
      );
    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_SECONDS * 1000,
    });
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Sign-in could not be verified. Please try again." },
      { status: 401 },
    );
  }
}
