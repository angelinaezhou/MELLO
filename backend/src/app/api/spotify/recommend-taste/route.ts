import { fetchAudioFeatures } from "@/lib/spotify";
import { toVector, cosineSimilarity } from "@/lib/similarity";

export async function POST(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return Response.json({ error: "No token" }, { status: 401 });

  const { rankedIds } = await req.json();
  if (!rankedIds?.length) return Response.json({ error: "No ranked IDs" }, { status: 400 });

  try {
    // Fetch top tracks to search against
    const topRes = await fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const topData = await topRes.json();
    const topTracks = topData.items ?? [];
    const topIds = topTracks.map((t: any) => t.id);

    // Fetch audio features for ranked songs and top tracks together
    const allIds = [...new Set([...rankedIds.slice(0, 10), ...topIds])];
    const allFeatures = await fetchAudioFeatures(token, allIds);

    // Build lookup map
    const featureMap: Record<string, any> = {};
    allIds.forEach((id: string, i: number) => {
      if (allFeatures[i]) featureMap[id] = allFeatures[i];
    });

    // Average ranked songs into taste vector
    const rankedFeatures = rankedIds
      .slice(0, 10)
      .map((id: string) => featureMap[id])
      .filter(Boolean);

    if (rankedFeatures.length === 0) {
      return Response.json({ error: "No audio features found" }, { status: 404 });
    }

    const tasteVector = rankedFeatures[0].map((_: any, i: number) =>
      toVector(rankedFeatures.reduce((sum: number[], f: any) =>
        toVector(f).map((v: number, j: number) => sum[j] + v),
        new Array(6).fill(0)
      )).map((v: number) => v / rankedFeatures.length)
    );

    // Actually compute taste vector properly
    const vectors = rankedFeatures.map((f: any) => toVector(f));
    const avgVector = vectors[0].map((_: number, i: number) =>
      vectors.reduce((sum: number, v: number[]) => sum + v[i], 0) / vectors.length
    );

    // Score top tracks against taste vector, exclude already ranked
    const rankedIdSet = new Set(rankedIds);
    const scored = topTracks
      .filter((t: any) => !rankedIdSet.has(t.id) && featureMap[t.id])
      .map((t: any) => ({
        track: {
          id: t.id,
          name: t.name,
          artist: t.artists[0]?.name ?? "Unknown",
          albumArt: t.album.images[0]?.url ?? "",
        },
        features: featureMap[t.id],
        score: cosineSimilarity(avgVector, toVector(featureMap[t.id])),
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 10);

    return Response.json({ recommendations: scored });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}