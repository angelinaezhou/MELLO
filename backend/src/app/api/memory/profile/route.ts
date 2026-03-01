import { NextResponse } from "next/server";
import { getTasteProfile } from "@/lib/supermemory";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const profile = await getTasteProfile(userId);
  console.log("PROFILE RESULT:", JSON.stringify(profile).slice(0, 300));
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  try {
    const content = typeof profile.content === "string" 
      ? JSON.parse(profile.content) 
      : profile.content;
    return NextResponse.json({ topTracks: content.topTracks ?? [] });
  } catch {
    return NextResponse.json({ error: "Invalid profile", raw: profile }, { status: 500 });
  }
}
