import { NextResponse } from "next/server";

const MODAL_URL = "https://kenjc2--mello-recommend-recommend.modal.run";

export async function POST(req: Request) {
  const { topSongs, token, friendSongs, friendName } = await req.json();

  try {
    // Fetch candidate songs from Spotify top 50
    const spotifyRes = await fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const spotifyData = await spotifyRes.json();
    const topTracks = spotifyData.items ?? [];

    // Filter out already ranked songs
    const rankedIds = new Set(topSongs.map((s: any) => s.id).filter(Boolean));
    const candidates = topTracks
      .filter((t: any) => !rankedIds.has(t.id))
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artists[0]?.name ?? "Unknown",
        albumArt: t.album.images[0]?.url ?? "",
      }));

    // Call Modal for embedding-based recommendations
    const modalRes = await fetch(MODAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topSongs,
        candidateSongs: candidates,
        friendSongs: friendSongs ?? [],
        friendName: friendName ?? "your friend",
      }),
    });

    if (!modalRes.ok) {
      const err = await modalRes.text();
      console.log("MODAL ERROR:", err);
      return NextResponse.json({ error: "Modal failed", detail: err }, { status: 500 });
    }

    const modalData = await modalRes.json();
    const recommendations = (modalData.recommendations ?? []).map((r: any) => ({
      track: {
        id: r.id,
        name: r.name,
        artist: r.artist,
        albumArt: r.albumArt,
      },
      explanation: r.explanation,
      score: r.score,
    }));

    return NextResponse.json({ recommendations });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}