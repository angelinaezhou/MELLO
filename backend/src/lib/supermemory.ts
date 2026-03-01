const BASE = "https://api.supermemory.ai/v3";
const KEY = process.env.SUPERMEMORY_API_KEY!;

export async function saveTasteProfile(userId: string, topTracks: any[]) {
  try {
    await fetch(`${BASE}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        content: JSON.stringify({
          type: "music_taste_profile",
          topTracks: topTracks.slice(0, 10).map((t: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artist,
            eloScore: t.eloScore,
            audioFeatures: t.audioFeatures,
          })),
          updatedAt: new Date().toISOString(),
        }),
        userId,
      }),
    });
  } catch (err) {
    console.error("Supermemory save failed:", err);
  }
}

export async function getTasteProfile(userId: string) {
  try {
    const res = await fetch(`${BASE}/documents?userId=${userId}&limit=1`, {
      headers: {
        "Authorization": `Bearer ${KEY}`,
      },
    });
    console.log("SUPERMEMORY GET STATUS:", res.status);
    const data = await res.json();
    console.log("SUPERMEMORY GET DATA:", JSON.stringify(data).slice(0, 300));
    
    const doc = data?.documents?.[0] ?? data?.results?.[0] ?? data?.[0] ?? null;
    if (!doc) return null;
    return doc;
  } catch (err) {
    console.error("Supermemory fetch failed:", err);
    return null;
  }
}
