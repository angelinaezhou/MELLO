import { useEffect, useState } from "react";
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useSpotifyAuth } from "../hooks/useSpotifyAuth";
import { calcElo } from "../utils/elo";

const BASE_URL = "https://mello-auth.vercel.app";
const MATCHUPS_NEEDED = 20;

type AudioFeatures = {
  id: string; energy: number; valence: number;
  danceability: number; acousticness: number;
  instrumentalness: number; tempo: number;
};

type Track = {
  id: string; name: string; artist: string;
  albumArt: string; audioFeatures: AudioFeatures | null;
};

export type EloEntry = Track & { eloScore: number; matchups: number };

function pickPair(entries: EloEntry[]): [EloEntry, EloEntry] {
  const sorted = [...entries].sort((a, b) => a.matchups - b.matchups);
  const left = sorted[0];
  const pool = sorted.slice(1, Math.min(10, sorted.length));
  const right = pool[Math.floor(Math.random() * pool.length)];
  return [left, right];
}

export default function Queue() {
  const router = useRouter();
  const { getValidToken } = useSpotifyAuth();
  const [eloMap, setEloMap] = useState<Record<string, EloEntry>>({});
  const [left, setLeft] = useState<EloEntry | null>(null);
  const [right, setRight] = useState<EloEntry | null>(null);
  const [matchupCount, setMatchupCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const saved = await SecureStore.getItemAsync("elo_scores");
        if (saved) {
          const parsed: Record<string, EloEntry> = JSON.parse(saved);
          const totalMatchups = Object.values(parsed).reduce((s, e) => s + e.matchups, 0) / 2;
          setEloMap(parsed);
          setMatchupCount(totalMatchups);
          const [l, r] = pickPair(Object.values(parsed));
          setLeft(l); setRight(r);
          setLoading(false);
          return;
        }

        const token = await getValidToken();
        if (!token) { setError("Not logged in — go back and connect Spotify"); setLoading(false); return; }

        const res = await fetch(`${BASE_URL}/api/spotify/top-tracks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.tracks) throw new Error("No tracks returned");

        const initial: Record<string, EloEntry> = {};
        for (const track of data.tracks as Track[]) {
          initial[track.id] = { ...track, eloScore: 1200, matchups: 0 };
        }

        await SecureStore.setItemAsync("elo_scores", JSON.stringify(initial));
        setEloMap(initial);
        const [l, r] = pickPair(Object.values(initial));
        setLeft(l); setRight(r);
      } catch (e: any) {
        setError("Failed to load tracks: " + e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function handlePick(winner: EloEntry, loser: EloEntry) {
    const { newWinner, newLoser } = calcElo(winner.eloScore, loser.eloScore);
    const updated = {
      ...eloMap,
      [winner.id]: { ...winner, eloScore: newWinner, matchups: winner.matchups + 1 },
      [loser.id]: { ...loser, eloScore: newLoser, matchups: loser.matchups + 1 },
    };
    const newCount = matchupCount + 1;
    setEloMap(updated);
    setMatchupCount(newCount);
    await SecureStore.setItemAsync("elo_scores", JSON.stringify(updated));

    if (newCount >= MATCHUPS_NEEDED) {
      router.push("/rankings");
      return;
    }
    const [l, r] = pickPair(Object.values(updated));
    setLeft(l); setRight(r);
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1db954" />
      <Text style={styles.dimText}>Loading your tracks...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  if (!left || !right) return null;

  const progress = Math.min(matchupCount / MATCHUPS_NEEDED, 1);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Which do you prefer?</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={styles.dimText}>{matchupCount} / {MATCHUPS_NEEDED} matchups</Text>

      <View style={styles.cards}>
        <TouchableOpacity style={styles.card} onPress={() => handlePick(left, right)} activeOpacity={0.8}>
          <Image source={{ uri: left.albumArt }} style={styles.albumArt} />
          <Text style={styles.songName} numberOfLines={2}>{left.name}</Text>
          <Text style={styles.artistName} numberOfLines={1}>{left.artist}</Text>
        </TouchableOpacity>

        <Text style={styles.vs}>VS</Text>

        <TouchableOpacity style={styles.card} onPress={() => handlePick(right, left)} activeOpacity={0.8}>
          <Image source={{ uri: right.albumArt }} style={styles.albumArt} />
          <Text style={styles.songName} numberOfLines={2}>{right.name}</Text>
          <Text style={styles.artistName} numberOfLines={1}>{right.artist}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => { const [l, r] = pickPair(Object.values(eloMap)); setLeft(l); setRight(r); }}
      >
        <Text style={styles.skipText}>Skip this pair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#fff", alignItems: "center", paddingTop: 60, paddingHorizontal: 16 },
  center:        { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", gap: 12 },
  header:        { color: "#1a1a1a", fontSize: 22, fontWeight: "700", marginBottom: 20, letterSpacing: -0.5 },
  progressTrack: { width: "100%", height: 4, backgroundColor: "#f0f0f0", borderRadius: 2, marginBottom: 8 },
  progressFill:  { height: "100%", backgroundColor: "#1db954", borderRadius: 2 },
  dimText:       { color: "#aaa", fontSize: 13, marginBottom: 32 },
  cards:         { flexDirection: "row", alignItems: "center", gap: 10, width: "100%" },
  card: {
    flex: 1, backgroundColor: "#fff", borderRadius: 20, padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  albumArt:      { width: "100%", aspectRatio: 1, borderRadius: 14, marginBottom: 10 },
  songName:      { color: "#1a1a1a", fontSize: 14, fontWeight: "600", textAlign: "center", marginBottom: 4 },
  artistName:    { color: "#aaa", fontSize: 12, textAlign: "center" },
  vs:            { color: "#1db954", fontSize: 18, fontWeight: "800" },
  skipButton:    { marginTop: 28 },
  skipText:      { color: "#ccc", fontSize: 14 },
  errorText:     { color: "#ff4444", textAlign: "center", paddingHorizontal: 32 },
});