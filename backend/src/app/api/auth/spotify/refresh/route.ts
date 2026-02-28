import { NextResponse } from "next/server";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function POST(req: Request) {
  const { refresh_token } = await req.json();
  if (!refresh_token) return NextResponse.json({ error: "no_refresh_token" }, { status: 401 });

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
      client_id: clientId,
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "refresh_failed" }, { status: 401 });

  const data = await res.json() as { access_token: string; expires_in: number; refresh_token?: string };
  return NextResponse.json(data);
}