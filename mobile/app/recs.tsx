import { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView,
  StyleSheet, ActivityIndicator
} from "react-native";
import { useSpotifyAuth } from "../hooks/useSpotifyAuth";
import { getRankedSongs } from "../utils/storage";

const BASE_URL = "https://mello-auth.vercel.app";

type Rec = {
  track: { id: string; name: string; artist: string; albumArt: string };
  score: number;
};

export default function Recs() {
  const { getValidToken } = useSpotifyAuth();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await getValidToken();
        console.log("TOKEN:", token);
        if (!token) { setError("Not logged in"); setLoading(false); return; }

        const ranked = await getRankedSongs();
        if (ranked.length === 0) {
          setError("Rank some songs first to get recommendations");
          setLoading(false);
          return;
        }
        

        const rankedIds = ranked
          .sort((a, b) => b.eloScore - a.eloScore)
          .slice(0, 10)
          .map(s => s.id);       
          
        const res = await fetch(`${BASE_URL}/api/spotify/recommend-taste`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rankedIds }),
        });
        
        console.log("RES STATUS:", res.status);
        const data = await res.json();
        console.log("DATA:", JSON.stringify(data));
        setRecs(data.recommendations ?? []);
      } catch (e: any) {
        setError("Couldn't load recommendations.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (recs.length === 0) return;
    async function fetchExplanations() {
      const ranked = await getRankedSongs();
      const topSong = ranked.sort((a, b) => b.eloScore - a.eloScore)[0];
      const results: Record<string, string> = {};
      await Promise.all(
        recs.slice(0, 5).map(async (rec) => {
          try {
            const res = await fetch(`${BASE_URL}/api/openai/explain`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                seed: { name: topSong?.name ?? "your taste", artist: topSong?.artist ?? "" },
                rec: { name: rec.track.name, artist: rec.track.artist },
              }),
            });
            const data = await res.json();
            results[rec.track.id] = data.explanation;
          } catch {
            results[rec.track.id] = "Matches your taste profile.";
          }
        })
      );
      setExplanations(results);
    }
    fetchExplanations();
  }, [recs]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1db954" />
      <Text style={styles.dimText}>Analyzing your taste...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>for you</Text>
        <Text style={styles.headerSubtitle}>based on your ranked songs</Text>
      </View>

      {recs.map((rec) => (
        <View key={rec.track.id} style={styles.recCard}>
          <Image source={{ uri: rec.track.albumArt }} style={styles.recArt} />
          <View style={styles.recInfo}>
            <Text style={styles.recName} numberOfLines={1}>{rec.track.name}</Text>
            <Text style={styles.recArtist} numberOfLines={1}>{rec.track.artist}</Text>
            <Text style={styles.recWhy}>
              {explanations[rec.track.id] ?? "Matches your taste profile."}
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
  container:      { flex: 1, backgroundColor: "#fff" },
  content:        { paddingBottom: 60 },
  center:         { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", gap: 12 },
  dimText:        { color: "#aaa", fontSize: 14 },
  errorText:      { color: "#ff4444", textAlign: "center", paddingHorizontal: 32 },
  header:         { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", marginBottom: 8 },
  headerTitle:    { fontSize: 22, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: "#888", marginTop: 2 },
  recCard:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  recArt:         { width: 52, height: 52, borderRadius: 8 },
  recInfo:        { flex: 1, marginLeft: 12 },
  recName:        { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  recArtist:      { fontSize: 13, color: "#888", marginTop: 2 },
  recWhy:         { fontSize: 12, color: "#bbb", marginTop: 4, lineHeight: 17 },
  matchBadge:     { alignItems: "center", marginLeft: 10 },
  matchPct:       { color: "#1db954", fontSize: 16, fontWeight: "700" },
  matchLabel:     { color: "#aaa", fontSize: 10 },
});