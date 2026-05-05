import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { refresh_token } = await request.json() as { refresh_token: string };

  if (!refresh_token || typeof refresh_token !== "string") {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set("wb_refresh", refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    // 7 days — refresh tokens outlive access tokens (15 min)
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
