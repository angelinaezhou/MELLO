const BASE = "https://api.supermemory.ai/v3";
const KEY = process.env.SUPERMEMORY_API_KEY!;

export async function saveTasteProfile(userId: string, topTracks: any[]) {
  try {
    const res = await fetch(`${BASE}/documents`, {
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
          })),
          updatedAt: new Date().toISOString(),
        }),
        containerTag: userId,
        customId: `taste-${userId}`,
      }),
    });
    const data = await res.json();
    console.log("SUPERMEMORY SAVE:", res.status, JSON.stringify(data));
  } catch (err) {
    console.error("Supermemory save failed:", err);
  }
}

export async function getTasteProfile(userId: string) {
  try {
    const res = await fetch(`${BASE}/documents/taste-${userId}`, {
      headers: {
        "Authorization": `Bearer ${KEY}`,
      },
    });
    console.log("SUPERMEMORY GET STATUS:", res.status);
    const data = await res.json();
    console.log("SUPERMEMORY GET DATA:", JSON.stringify(data).slice(0, 300));
    
    if (!res.ok) return null;
    
    const content = data?.content ?? data?.document?.content ?? null;
    if (!content) return null;
    
    return { content };
  } catch (err) {
    console.error("Supermemory fetch failed:", err);
    return null;
  }
}
