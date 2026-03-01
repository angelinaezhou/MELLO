import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { topSongs, token } = await req.json();

  // Ask GPT to recommend songs
  const prompt = `You are a music expert. Based on these songs the user loves most:
${topSongs.map((s: any, i: number) => `${i + 1}. "${s.name}" by ${s.artist}`).join("\n")}

Recommend 10 songs they would love that are NOT in this list. For each song provide:
- A real song that exists on Spotify
- Why they'd love it in one sentence (max 15 words)
- A match percentage (70-99) based on similarity to their taste

Return ONLY valid JSON array:
[{"name": "Song Name", "artist": "Artist Name", "explanation": "one sentence why", "match": 92}, ...]`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 800,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "OpenAI failed" }, { status: 500 });

  const data = await res.json();
  const text = data.choices[0].message.content.trim()
    .replace(/```json|```/g, "").trim();

  try {
    const suggestions = JSON.parse(text);

    // Search each suggestion on Spotify to get real track data
    const tracks = await Promise.all(
      suggestions.map(async (s: any) => {
        try {
          const searchRes = await fetch(
            `https://api.spotify.com/v1/search?q=track:${encodeURIComponent(s.name)}+artist:${encodeURIComponent(s.artist)}&type=track&limit=1`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const searchData = await searchRes.json();
          const track = searchData.tracks?.items?.[0];
          if (!track) return null;
          return {
            track: {
              id: track.id,
              name: track.name,
              artist: track.artists[0]?.name ?? s.artist,
              albumArt: track.album.images[0]?.url ?? "",
            },
            explanation: s.explanation,
            score: s.match / 100,
          };
        } catch {
          return null;
        }
      })
    );

    const valid = tracks.filter(Boolean);
    return NextResponse.json({ recommendations: valid });
  } catch {
    return NextResponse.json({ error: "Failed to parse GPT response" }, { status: 500 });
  }
}