import { NextResponse } from "next/server";
import { saveTasteProfile } from "@/lib/supermemory";

export async function POST(req: Request) {
  const { userId, topTracks } = await req.json();
  if (!userId || !topTracks) {
    return NextResponse.json({ error: "Missing userId or topTracks" }, { status: 400 });
  }
  await saveTasteProfile(userId, topTracks);
  return NextResponse.json({ ok: true });
}