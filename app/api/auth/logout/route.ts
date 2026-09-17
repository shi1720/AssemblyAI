import { trustedOrigin } from "@/lib/auth-security";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
  if (!trustedOrigin(request))
    return NextResponse.json(
      { error: "Unrecognized origin." },
      { status: 403 },
    );
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  response.cookies.set("__session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
