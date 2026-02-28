import * as SecureStore from "expo-secure-store";

const BASE_URL = "https://mello-auth.vercel.app";

export function useSpotifyAuth() {
  const getValidToken = async (): Promise<string | null> => {
    const accessToken = await SecureStore.getItemAsync("access_token");
    const expiresIn = await SecureStore.getItemAsync("expires_in");
    const storedAt = await SecureStore.getItemAsync("stored_at");

    if (!accessToken) return null;

    // Check if token is expired
    const now = Date.now();
    const storedTime = Number(storedAt ?? 0);
    const expiryMs = Number(expiresIn ?? 0) * 1000;
    const isExpired = now - storedTime > expiryMs;

    if (!isExpired) return accessToken;

    // Token expired, refresh it
    const res = await fetch(`${BASE_URL}/api/auth/spotify/refresh`, {
      method: "POST",
    });

    if (!res.ok) return null;

    const { access_token, expires_in } = await res.json();
    await SecureStore.setItemAsync("access_token", access_token);
    await SecureStore.setItemAsync("expires_in", String(expires_in));
    await SecureStore.setItemAsync("stored_at", String(Date.now()));

    return access_token;
  };

  return { getValidToken };
}