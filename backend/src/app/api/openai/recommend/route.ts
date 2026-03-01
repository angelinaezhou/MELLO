import { NextResponse } from "next/server";

const MODAL_URL = "https://kenjc2--mello-recommend-recommend.modal.run";

export async function POST(req: Request) {
  const { topSongs, token, friendSongs, friendName, userId } = await req.json();

  // Fetch Supermemory historical profile
  let historicalSongs: any[] = [];
  if (userId) {
    try {
      const memRes = await fetch(`https://mello-auth.vercel.app/api/memory/profile?userId=${userId}`);
      if (memRes.ok) {
        const memData = await memRes.json();
        historicalSongs = memData.topTracks ?? [];
      }
    } catch {}
  }

  try {
    // Build artist list from both users
    const myArtists = topSongs.slice(0, 5).map((s: any) => s.artist);
    const friendArtists = (friendSongs ?? []).slice(0, 5).map((s: any) => s.artist);
    const allArtists = [...new Set([...myArtists, ...friendArtists])];

    // Search Spotify for tracks from both users' artists
    const searchResults = await Promise.all(
      allArtists.map((artist: string) =>
        fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=track&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json())
      )
    );

    const rankedIds = new Set(topSongs.map((s: any) => s.id).filter(Boolean));
    const candidates = searchResults
      .flatMap(r => r.tracks?.items ?? [])
      .filter((t: any) => !rankedIds.has(t.id))
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artists[0]?.name ?? "Unknown",
        albumArt: t.album.images[0]?.url ?? "",
      }));

    // Remove duplicates
    const seen = new Set();
    const uniqueCandidates = candidates.filter((c: any) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    // Call Modal for embedding-based recommendations
    const modalRes = await fetch(MODAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topSongs,
        candidateSongs: uniqueCandidates,
        friendSongs: friendSongs ?? [],
        friendName: friendName ?? "your friend",
        historicalSongs,
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
