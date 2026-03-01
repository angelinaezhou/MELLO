import { NextResponse } from "next/server";
import { getTasteProfile } from "@/lib/supermemory";

export async function POST(req: Request) {
  const { topSongs, token, userId, friendSongs, friendName } = await req.json();

  let prompt;

  if (friendSongs?.length) {
    prompt = `You are a music expert. User 1 loves these songs:
${topSongs.map((s: any, i: number) => `${i + 1}. "${s.name}" by ${s.artist}`).join("\n")}

User 2 (${friendName ?? "their friend"}) loves these songs:
${friendSongs.map((s: any, i: number) => `${i + 1}. "${s.name}" by ${s.artist}`).join("\n")}

Recommend 10 songs BOTH users would love based on their overlapping taste. For each song:
- Must be a real song on Spotify
- One sentence explaining why both would love it (max 15 words)
- Match percentage (70-99) based on how well it fits both tastes

Return ONLY valid JSON array:
[{"name": "Song Name", "artist": "Artist Name", "explanation": "one sentence why", "match": 92}, ...]`;
  } else {
    prompt = `You are a music expert. Based on these songs the user loves most:
${topSongs.map((s: any, i: number) => `${i + 1}. "${s.name}" by ${s.artist}`).join("\n")}

Recommend 10 songs they would love that are NOT in this list. For each song:
- Must be a real song on Spotify
- One sentence explaining why they'd love it (max 15 words)
- Match percentage (70-99) based on similarity to their taste

Return ONLY valid JSON array:
[{"name": "Song Name", "artist": "Artist Name", "explanation": "one sentence why", "match": 92}, ...]`;
  }

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

    return NextResponse.json({ recommendations: tracks.filter(Boolean) });
  } catch {
    return NextResponse.json({ error: "Failed to parse GPT response" }, { status: 500 });
  }
}