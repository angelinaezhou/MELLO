import { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView,
  StyleSheet, ActivityIndicator, TouchableOpacity
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
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
    { label: "Energy",       value: features.energy,       color: "#FF6B6B" },
    { label: "Mood",         value: features.valence,      color: "#1DB954" },
    { label: "Danceability", value: features.danceability, color: "#4ECDC4" },
    { label: "Acoustic",     value: features.acousticness, color: "#FFD93D" },
  ];
  return (
    <View style={styles.featureBars}>
      {bars.map((bar) => (
        <View key={bar.label} style={styles.barRow}>
          <Text style={styles.barLabel}>{bar.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, {
              width: `${Math.round(bar.value * 100)}%` as any,
              backgroundColor: bar.color
            }]} />
          </View>
          <Text style={styles.barValue}>{Math.round(bar.value * 100)}</Text>
        </View>
      ))}
    </View>
  );
}

function explainSimilarity(seed: AudioFeatures, rec: AudioFeatures): string {
  const reasons: string[] = [];
  if (Math.abs(seed.energy - rec.energy) < 0.15) reasons.push("similar energy");
  if (Math.abs(seed.valence - rec.valence) < 0.15) reasons.push("same mood");
  if (Math.abs(seed.danceability - rec.danceability) < 0.15) reasons.push("equally danceable");
  if (Math.abs(seed.acousticness - rec.acousticness) < 0.15) reasons.push("same acoustic feel");
  if (reasons.length === 0) reasons.push("similar sonic profile");
  return `Matched on ${reasons.join(", ")}.`;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      {loading && <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 32 }} />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {!loading && recs.map((rec) => (
        <View key={rec.track.id} style={styles.recCard}>
          <Image source={{ uri: rec.track.albumArt }} style={styles.recArt} />
          <View style={styles.recInfo}>
            <Text style={styles.recName} numberOfLines={1}>{rec.track.name}</Text>
            <Text style={styles.recArtist} numberOfLines={1}>{rec.track.artist}</Text>
            <Text style={styles.recWhy}>
              {rec.features ? explainSimilarity(audioFeatures, rec.features) : "Similar vibe."}
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
  container:   { flex: 1, backgroundColor: "#191414" },
  content:     { padding: 20, paddingBottom: 60 },
  backButton:  { marginBottom: 16 },
  backText:    { color: "#1DB954", fontSize: 16, fontWeight: "600" },
  seedCard:    { flexDirection: "row", alignItems: "center", backgroundColor: "#282828", borderRadius: 12, padding: 16, marginBottom: 24 },
  albumArt:    { width: 72, height: 72, borderRadius: 8 },
  seedInfo:    { flex: 1, marginLeft: 14 },
  seedName:    { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  seedArtist:  { color: "#B3B3B3", fontSize: 14, marginTop: 2 },
  rankBadge:   { alignSelf: "flex-start", backgroundColor: "#1DB954", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  rankText:    { color: "#191414", fontSize: 12, fontWeight: "700" },
  sectionHeader: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginBottom: 12, marginTop: 8 },
  featureBars: { backgroundColor: "#282828", borderRadius: 12, padding: 16, marginBottom: 24 },
  barRow:      { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  barLabel:    { color: "#B3B3B3", fontSize: 12, width: 90 },
  barTrack:    { flex: 1, height: 6, backgroundColor: "#404040", borderRadius: 3, overflow: "hidden" },
  barFill:     { height: "100%", borderRadius: 3 },
  barValue:    { color: "#B3B3B3", fontSize: 12, width: 30, textAlign: "right" },
  recCard:     { flexDirection: "row", alignItems: "center", backgroundColor: "#282828", borderRadius: 12, padding: 14, marginBottom: 12 },
  recArt:      { width: 56, height: 56, borderRadius: 6 },
  recInfo:     { flex: 1, marginLeft: 12 },
  recName:     { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  recArtist:   { color: "#B3B3B3", fontSize: 13, marginTop: 2 },
  recWhy:      { color: "#888", fontSize: 12, marginTop: 6, lineHeight: 17 },
  matchBadge:  { alignItems: "center", marginLeft: 10 },
  matchPct:    { color: "#1DB954", fontSize: 16, fontWeight: "700" },
  matchLabel:  { color: "#B3B3B3", fontSize: 10 },
  errorText:   { color: "#FF6B6B", textAlign: "center", marginTop: 20 },
});