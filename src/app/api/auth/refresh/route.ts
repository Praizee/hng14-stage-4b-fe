import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BASE_URL = "https://whisperbox.koyeb.app";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("wb_refresh")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    // Clear the stale cookie
    cookieStore.delete("wb_refresh");
    return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
  }

  const data = await res.json() as { access_token: string; token_type: string; expires_in: number };
  return NextResponse.json(data);
}
