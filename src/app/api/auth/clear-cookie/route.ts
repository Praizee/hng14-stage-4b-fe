import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("wb_refresh");
  return NextResponse.json({ ok: true });
}
