const BASE = "https://api.spotify.com/v1";

export async function fetchTopTracks(accessToken: string, limit = 50) {
  const res = await fetch(
    `${BASE}/me/top/tracks?limit=${limit}&time_range=medium_term`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`top-tracks failed: ${res.status}`);
  const data = await res.json();
  return data.items ?? [];
}

export async function fetchAudioFeatures(accessToken: string, ids: string[]) {
  const res = await fetch(
    `${BASE}/audio-features?ids=${ids.slice(0, 100).join(",")}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`audio-features failed: ${res.status}`);
  const data = await res.json();
  return data.audio_features ?? [];
}