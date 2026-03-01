export async function POST(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return Response.json({ error: "No token" }, { status: 401 });

  const { rankedIds } = await req.json();
  if (!rankedIds?.length) return Response.json({ error: "No ranked IDs" }, { status: 400 });

  try {
    // 1️⃣ Validate seed tracks with Spotify
    const resCheck = await fetch(
      `https://api.spotify.com/v1/tracks?ids=${rankedIds.join(",")}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!resCheck.ok) {
      const errText = await resCheck.text();
      console.error("Spotify track validation failed:", resCheck.status, errText);
      return Response.json(
        { error: `Spotify track check failed: ${resCheck.status} ${errText}` },
        { status: 500 }
      );
    }

    const trackData = await resCheck.json();
    const validIds = (trackData.tracks ?? [])
      .filter((t: any) => t) // remove nulls/unavailable tracks
      .map((t: any) => t.id);

    if (!validIds.length) return Response.json({ error: "No valid seed tracks", status: 400 });

    const seedTracks = validIds.slice(0, 5).join(",");

    // 2️⃣ Request recommendations
    const res = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTracks}&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Spotify recommendations failed:", res.status, err);
      return Response.json({ error: `Spotify recs failed: ${res.status} ${err}` }, { status: 500 });
    }

    const data = await res.json();

    // 3️⃣ Map to your format
    const recommendations = (data.tracks ?? []).map((t: any) => ({
      track: {
        id: t.id,
        name: t.name,
        artist: t.artists[0]?.name ?? "Unknown",
        albumArt: t.album.images[0]?.url ?? "",
      },
      score: Math.random() * 0.15 + 0.85, // 85–100% match
    }));

    return Response.json({ recommendations });
  } catch (e: any) {
    console.error("Unexpected error in recommendations:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}