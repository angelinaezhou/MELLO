import { NextResponse } from "next/server";
import { getTasteProfile } from "@/lib/supermemory";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const profile = await getTasteProfile(userId);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  try {
    const raw = typeof profile.content === "string" ? profile.content : JSON.stringify(profile.content);
    
    // Content may have multiple JSON objects separated by ---
    // Take the LAST one (most recent)
    const parts = raw.split("---").map((p: string) => p.trim()).filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const parsed = JSON.parse(lastPart);
    
    return NextResponse.json({ topTracks: parsed.topTracks ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid profile", detail: e.message }, { status: 500 });
  }
}
