export async function POST(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return Response.json({ error: "No token" }, { status: 401 });

  const { rankedIds } = await req.json();
  if (!rankedIds?.length) return Response.json({ error: "No ranked IDs" }, { status: 400 });

  try {
    // Use top 5 ranked songs as seeds
    const seedTracks = rankedIds.slice(0, 5).join(",");

    const res = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTracks}&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Spotify recs failed: ${res.status} ${err}` }, { status: 500 });
    }

    const data = await res.json();
    const recommendations = (data.tracks ?? []).map((t: any) => ({
      track: {
        id: t.id,
        name: t.name,
        artist: t.artists[0]?.name ?? "Unknown",
        albumArt: t.album.images[0]?.url ?? "",
      },
      score: Math.random() * 0.15 + 0.85, // 85-100% match since Spotify already filtered
    }));

    return Response.json({ recommendations });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}