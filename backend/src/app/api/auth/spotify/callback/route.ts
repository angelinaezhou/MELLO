// callback route.ts, Receives code, exchanges for tokens, stores cookies, redirects to UI

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const appUrl = process.env.APP_URL ?? "exp://10.4.151.47:8081";
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;

  if (error) {
    return NextResponse.redirect(`${appUrl}/?auth=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/?auth=error&reason=missing_code`);
  }

  const cookieStore = await cookies();
  const verifier = cookieStore.get("sp_pkce_verifier")?.value;
  const expectedState = cookieStore.get("sp_oauth_state")?.value;

  if (!verifier || !expectedState || returnedState !== expectedState) {
    return NextResponse.redirect(`${appUrl}/?auth=error&reason=bad_state`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/?auth=error&reason=token_exchange_failed`);
  }

  const tokenJson = await tokenRes.json() as {
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token?: string;
  };

  // Clean up temporary cookies
  cookieStore.delete("sp_pkce_verifier");
  cookieStore.delete("sp_oauth_state");

  // Pass tokens to Expo app via URL params — cookies won't work cross-app
  const params = new URLSearchParams({
    auth: "success",
    access_token: tokenJson.access_token,
    expires_in: String(tokenJson.expires_in),
    ...(tokenJson.refresh_token && { refresh_token: tokenJson.refresh_token }),
  });

return NextResponse.redirect(`${appUrl}?${params.toString()}`);
}