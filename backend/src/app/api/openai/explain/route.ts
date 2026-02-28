import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { seed, rec } = await req.json();

  const prompt = `In one sentence, explain why someone who loves "${seed.name}" by ${seed.artist} would enjoy "${rec.name}" by ${rec.artist}. Focus on musical qualities only, be specific and natural. No more than 20 words.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 60,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "OpenAI failed" }, { status: 500 });

  const data = await res.json();
  const explanation = data.choices[0].message.content.trim();
  return NextResponse.json({ explanation });
}