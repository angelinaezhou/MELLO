import * as SecureStore from "expo-secure-store";

export type RankedSong = {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  albumArt: string;
  eloScore: number;        // internal only, never shown
  normalizedScore: number; // 0-100 shown to user
  review: string;
  vibe: "loved" | "okay" | "dislike";
  matchups: number;
  genres: string[];
};

export type QueuedSong = {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  albumArt: string;
  bookmarked: boolean;
};

const RANKED_KEY = "ranked_songs";
const BOOKMARKS_KEY = "bookmarked_songs";
const ADDED_IDS_KEY = "added_song_ids"; // tracks which songs have left the add page

// ── Ranked songs ──────────────────────────────────────────

export async function getRankedSongs(): Promise<RankedSong[]> {
  const saved = await SecureStore.getItemAsync(RANKED_KEY);
  return saved ? JSON.parse(saved) : [];
}

export async function saveRankedSongs(songs: RankedSong[]): Promise<void> {
  await SecureStore.setItemAsync(RANKED_KEY, JSON.stringify(songs));
}

export async function addRankedSong(song: RankedSong): Promise<RankedSong[]> {
  const existing = await getRankedSongs();
  const updated = [...existing, song];

  // Renormalize all scores after adding
  const { normalizeScores } = await import("./elo");
  const normalized = normalizeScores(updated);
  const renormalized = updated.map((s, i) => ({ ...s, normalizedScore: normalized[i] }));

  await saveRankedSongs(renormalized);
  await markAsAdded(song.id);
  return renormalized;
}

export async function updateRankedSong(updated: RankedSong): Promise<RankedSong[]> {
  const existing = await getRankedSongs();
  const replaced = existing.map((s) => (s.id === updated.id ? updated : s));

  // Renormalize after every ELO update
  const { normalizeScores } = await import("./elo");
  const normalized = normalizeScores(replaced);
  const renormalized = replaced.map((s, i) => ({ ...s, normalizedScore: normalized[i] }));

  await saveRankedSongs(renormalized);
  return renormalized;
}

// ── Bookmarks ─────────────────────────────────────────────

export async function getBookmarks(): Promise<QueuedSong[]> {
  const saved = await SecureStore.getItemAsync(BOOKMARKS_KEY);
  return saved ? JSON.parse(saved) : [];
}

export async function toggleBookmark(song: QueuedSong): Promise<QueuedSong[]> {
  const existing = await getBookmarks();
  const isBookmarked = existing.some((s) => s.id === song.id);

  const updated = isBookmarked
    ? existing.filter((s) => s.id !== song.id)
    : [...existing, { ...song, bookmarked: true }];

  await SecureStore.setItemAsync(BOOKMARKS_KEY, JSON.stringify(updated));
  return updated;
}

// ── Added IDs (songs that have left the add page) ─────────

export async function getAddedIds(): Promise<Set<string>> {
  const saved = await SecureStore.getItemAsync(ADDED_IDS_KEY);
  return saved ? new Set(JSON.parse(saved)) : new Set();
}

export async function markAsAdded(id: string): Promise<void> {
  const existing = await getAddedIds();
  existing.add(id);
  await SecureStore.setItemAsync(ADDED_IDS_KEY, JSON.stringify([...existing]));
}