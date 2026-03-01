import { NextResponse } from "next/server";
import { getTasteProfile } from "@/lib/supermemory";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const profile = await getTasteProfile(userId);
  return NextResponse.json({ profile });
}