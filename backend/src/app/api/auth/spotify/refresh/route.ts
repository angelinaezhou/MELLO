// If access token expired, use refresh token to get new one.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("sp_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "no_refresh_token" }, { status: 401 });
  }

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
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
  }

  const tokenJson = await res.json() as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  cookieStore.set("sp_access_token", tokenJson.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: tokenJson.expires_in,
  });

  // Spotify sometimes rotates the refresh token, so update it if a new one is returned
  if (tokenJson.refresh_token) {
    cookieStore.set("sp_refresh_token", tokenJson.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return NextResponse.json({
    access_token: tokenJson.access_token,
    expires_in: tokenJson.expires_in,
  });
}