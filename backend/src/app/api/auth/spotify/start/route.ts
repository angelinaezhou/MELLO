// start route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { codeChallengeFromVerifier, generateCodeVerifier, randomState } from "@/lib/spotifyAuth";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;

  const verifier = generateCodeVerifier();
  const challenge = await codeChallengeFromVerifier(verifier);
  const state = randomState();

  const cookieStore = await cookies();

  cookieStore.set("sp_pkce_verifier", verifier, {
    httpOnly: true,
    secure: true,
    sameSite: "none",  // needed for cross-origin redirect flow
    path: "/",
    maxAge: 10 * 60,
  });

  cookieStore.set("sp_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none",  // needed for cross-origin redirect flow
    path: "/",
    maxAge: 10 * 60,
  });

  const scopes = [
    "user-read-email",
    "user-read-private",
    "user-top-read",
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  return NextResponse.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`);
}