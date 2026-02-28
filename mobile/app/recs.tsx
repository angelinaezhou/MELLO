import { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView,
  StyleSheet, ActivityIndicator, TouchableOpacity
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSpotifyAuth } from "../hooks/useSpotifyAuth";

const BASE_URL = "https://mello-auth.vercel.app";

type AudioFeatures = {
  energy: number; valence: number; danceability: number;
  acousticness: number; instrumentalness: number; tempo: number;
};

type Rec = {
  track: { id: string; name: string; artist: string; albumArt: string };
  features: AudioFeatures;
  score: number;
};

function FeatureBars({ features }: { features: AudioFeatures }) {
  const bars = [
    { label: "Energy",       value: features.energy,       color: "#ff6b6b" },
    { label: "Mood",         value: features.valence,      color: "#1db954" },
    { label: "Danceability", value: features.danceability, color: "#4ecdc4" },
    { label: "Acoustic",     value: features.acousticness, color: "#ffd93d" },
  ];
  return (
    <View style={styles.featureBars}>
      {bars.map((bar) => (
        <View key={bar.label} style={styles.barRow}>
          <Text style={styles.barLabel}>{bar.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, {
              width: `${Math.round(bar.value * 100)}%` as any,
              backgroundColor: bar.color,
            }]} />
          </View>
          <Text style={styles.barValue}>{Math.round(bar.value * 100)}</Text>
        </View>
      ))}
    </View>
  );
}



export default function Recs() {
  const router = useRouter();
  const { getValidToken } = useSpotifyAuth();
  const params = useLocalSearchParams<{
    songId: string; songName: string; artist: string;
    albumArt: string; rank: string; eloScore: string; audioFeatures: string;
  }>();

  const audioFeatures: AudioFeatures = params.audioFeatures
    ? JSON.parse(params.audioFeatures)
    : { energy: 0.5, valence: 0.5, danceability: 0.5, acousticness: 0.5, instrumentalness: 0.5, tempo: 120 };

  const [recs, setRecs] = useState<Rec[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (recs.length === 0) return;
  async function fetchExplanations() {
    const results: Record<string, string> = {};
    await Promise.all(
      recs.map(async (rec) => {
        try {
          const res = await fetch(`${BASE_URL}/api/openai/explain`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              seed: { name: params.songName, artist: params.artist },
              rec: { name: rec.track.name, artist: rec.track.artist },
            }),
          });
          const data = await res.json();
          results[rec.track.id] = data.explanation;
        } catch {
          results[rec.track.id] = "Similar sonic profile.";
        }
      })
    );
    setExplanations(results);
  }
  fetchExplanations();
}, [recs]);


  useEffect(() => {
    async function load() {
      try {
        const token = await getValidToken();
        if (!token) { setError("Not logged in"); setLoading(false); return; }
        const res = await fetch(
          `${BASE_URL}/api/spotify/recommend?songId=${params.songId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setRecs(data.recommendations ?? []);
      } catch (e: any) {
        setError("Couldn't load recommendations.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.songId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Seed song */}
      <View style={styles.seedCard}>
        <Image source={{ uri: params.albumArt }} style={styles.albumArt} />
        <View style={styles.seedInfo}>
          <Text style={styles.seedName} numberOfLines={1}>{params.songName}</Text>
          <Text style={styles.seedArtist} numberOfLines={1}>{params.artist}</Text>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{params.rank} · {params.eloScore} pts</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Audio Profile</Text>
      <FeatureBars features={audioFeatures} />

      <Text style={styles.sectionHeader}>Because you love this...</Text>

      {loading && <ActivityIndicator size="large" color="#1db954" style={{ marginTop: 32 }} />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {!loading && recs.map((rec) => (
        <View key={rec.track.id} style={styles.recCard}>
          <Image source={{ uri: rec.track.albumArt }} style={styles.recArt} />
          <View style={styles.recInfo}>
            <Text style={styles.recName} numberOfLines={1}>{rec.track.name}</Text>
            <Text style={styles.recArtist} numberOfLines={1}>{rec.track.artist}</Text>
            <Text style={styles.recWhy}>
              {explanations[rec.track.id] ?? "Loading..."}
            </Text>
          </View>
          <View style={styles.matchBadge}>
            <Text style={styles.matchPct}>{Math.round(rec.score * 100)}%</Text>
            <Text style={styles.matchLabel}>match</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#fff" },
  content:       { padding: 20, paddingBottom: 60 },
  backButton:    { marginBottom: 16, marginTop: 20 },
  backText:      { color: "#1db954", fontSize: 16, fontWeight: "600" },
  seedCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 20, padding: 16, marginBottom: 24,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  albumArt:      { width: 72, height: 72, borderRadius: 12 },
  seedInfo:      { flex: 1, marginLeft: 14 },
  seedName:      { color: "#1a1a1a", fontSize: 18, fontWeight: "700" },
  seedArtist:    { color: "#aaa", fontSize: 14, marginTop: 2 },
  rankBadge:     { alignSelf: "flex-start", backgroundColor: "#1db954", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  rankText:      { color: "#fff", fontSize: 12, fontWeight: "700" },
  sectionHeader: { color: "#1a1a1a", fontSize: 16, fontWeight: "700", marginBottom: 12, marginTop: 8 },
  featureBars:   { backgroundColor: "#f9f9f9", borderRadius: 16, padding: 16, marginBottom: 24 },
  barRow:        { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  barLabel:      { color: "#aaa", fontSize: 12, width: 90 },
  barTrack:      { flex: 1, height: 6, backgroundColor: "#eee", borderRadius: 3, overflow: "hidden" },
  barFill:       { height: "100%", borderRadius: 3 },
  barValue:      { color: "#aaa", fontSize: 12, width: 30, textAlign: "right" },
  recCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  recArt:        { width: 56, height: 56, borderRadius: 8 },
  recInfo:       { flex: 1, marginLeft: 12 },
  recName:       { color: "#1a1a1a", fontSize: 15, fontWeight: "600" },
  recArtist:     { color: "#aaa", fontSize: 13, marginTop: 2 },
  recWhy:        { color: "#bbb", fontSize: 12, marginTop: 6, lineHeight: 17 },
  matchBadge:    { alignItems: "center", marginLeft: 10 },
  matchPct:      { color: "#1db954", fontSize: 16, fontWeight: "700" },
  matchLabel:    { color: "#aaa", fontSize: 10 },
  errorText:     { color: "#ff4444", textAlign: "center", marginTop: 20 },
});