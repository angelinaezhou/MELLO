import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { tracks } = await req.json();
  if (!tracks || tracks.length === 0) {
    return NextResponse.json({ error: "No tracks provided" }, { status: 400 });
  }

  const trackList = tracks
    .slice(0, 10)
    .map((t: any, i: number) => `${i + 1}. "${t.name}" by ${t.artist}`)
    .join("\n");

  const avgEnergy = (tracks.slice(0, 10).reduce((s: number, t: any) => s + (t.audioFeatures?.energy ?? 0.5), 0) / 10).toFixed(2);
  const avgValence = (tracks.slice(0, 10).reduce((s: number, t: any) => s + (t.audioFeatures?.valence ?? 0.5), 0) / 10).toFixed(2);
  const avgTempo = (tracks.slice(0, 10).reduce((s: number, t: any) => s + (t.audioFeatures?.tempo ?? 120), 0) / 10).toFixed(0);

  const prompt = `You are a witty music psychologist. A user ranked these songs from most to least preferred:

${trackList}

Their audio profile: avg energy ${avgEnergy}/1.0, avg mood ${avgValence}/1.0 (0=sad, 1=happy), avg tempo ${avgTempo}bpm.

Give them a creative music personality. Return ONLY valid JSON, no markdown, no backticks:
{"name": "2-3 word creative title like The Melancholic Voyager", "description": "2 sentences, specific and witty, referencing their actual taste"}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 150,
      temperature: 0.8,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "OpenAI failed" }, { status: 500 });

  const data = await res.json();
  const text = data.choices[0].message.content.trim();

  try {
    const persona = JSON.parse(text);
    return NextResponse.json(persona);
  } catch {
    return NextResponse.json({ error: "Failed to parse persona" }, { status: 500 });
  }
}