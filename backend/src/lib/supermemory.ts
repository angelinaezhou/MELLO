const BASE = "https://api.supermemory.ai/v3";
const KEY = process.env.SUPERMEMORY_API_KEY!;

export async function saveTasteProfile(userId: string, topTracks: any[]) {
  try {
    await fetch(`${BASE}/memories`, {
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
    const res = await fetch(`${BASE}/memories/search?q=music+taste+profile&userId=${userId}&limit=1`, {
      headers: {
        "Authorization": `Bearer ${KEY}`,
      },
    });
    const data = await res.json();
    return data?.results?.[0] ?? null;
  } catch (err) {
    console.error("Supermemory fetch failed:", err);
    return null;
  }
}