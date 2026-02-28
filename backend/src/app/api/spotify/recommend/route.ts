import { fetchTopTracks, fetchAudioFeatures } from "@/lib/spotify";

export async function GET(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return Response.json({ error: "No token" }, { status: 401 });

  try {
    const raw = await fetchTopTracks(token, 50);
    const ids = raw.map((t: any) => t.id);
    const features = await fetchAudioFeatures(token, ids);

    const tracks = raw.map((t: any, i: number) => ({
      id: t.id,
      name: t.name,
      artist: t.artists[0]?.name ?? "Unknown",
      albumArt: t.album.images[0]?.url ?? "",
      audioFeatures: features[i] ? {
        id: features[i].id,
        energy: features[i].energy,
        valence: features[i].valence,
        danceability: features[i].danceability,
        acousticness: features[i].acousticness,
        instrumentalness: features[i].instrumentalness,
        tempo: features[i].tempo,
      } : null,
    }));

    return Response.json({ tracks });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}