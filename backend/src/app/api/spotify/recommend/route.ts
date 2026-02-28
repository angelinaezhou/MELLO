import { fetchTopTracks, fetchAudioFeatures } from "@/lib/spotify";
import { toVector, cosineSimilarity } from "@/lib/similarity";

export async function GET(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return Response.json({ error: "No token" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const songId = searchParams.get("songId");
  if (!songId) return Response.json({ error: "Missing songId" }, { status: 400 });

  try {
    const raw = await fetchTopTracks(token, 50);
    const ids = raw.map((t: any) => t.id);
    const features = await fetchAudioFeatures(token, ids);

    const seedIndex = ids.indexOf(songId);
    if (seedIndex === -1) return Response.json({ error: "Song not found" }, { status: 404 });

    const seedVector = toVector(features[seedIndex]);

    const scored = raw
      .map((t: any, i: number) => ({
        track: {
          id: t.id,
          name: t.name,
          artist: t.artists[0]?.name ?? "Unknown",
          albumArt: t.album.images[0]?.url ?? "",
        },
        features: features[i],
        score: cosineSimilarity(seedVector, toVector(features[i])),
      }))
      .filter((r: any) => r.track.id !== songId && r.features)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    return Response.json({ recommendations: scored });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}