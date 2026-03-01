import { NextResponse } from "next/server";
import { getTasteProfile } from "@/lib/supermemory";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const profile = await getTasteProfile(userId);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  try {
    const parsed = JSON.parse(profile.content ?? profile);
    return NextResponse.json({ topTracks: parsed.topTracks ?? [] });
  } catch {
    return NextResponse.json({ error: "Invalid profile" }, { status: 500 });
  }
}