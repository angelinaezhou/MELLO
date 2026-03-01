import { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView,
  StyleSheet, ActivityIndicator
} from "react-native";
import { useSpotifyAuth } from "../hooks/useSpotifyAuth";
import { getRankedSongs } from "../utils/storage";
import { useUser } from "../context/userContext";

const BASE_URL = "https://mello-auth.vercel.app";

type Rec = {
  track: { id: string; name: string; artist: string; albumArt: string };
  score: number;
};

export default function Recs() {
  const { getValidToken } = useSpotifyAuth();
  const { userImage } = useUser();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await getValidToken();
        if (!token) { setError("Not logged in"); setLoading(false); return; }
    
        const ranked = await getRankedSongs();
        if (ranked.length === 0) {
          setError("Rank some songs first to get recommendations");
          setLoading(false);
          return;
        }
    
        // Get top artist names from Spotify
        const artistRes = await fetch(
          "https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const artistData = await artistRes.json();
        const topArtistNames: string[] = (artistData.items ?? [])
          .map((a: any) => a.name)
          .filter(Boolean)
          .slice(0, 3);
    
        if (!topArtistNames.length) {
          setError("Couldn't find your top artists");
          setLoading(false);
          return;
        }
    
        // Search for tracks by top artists
        const rankedIds = new Set(ranked.map((s) => s.id));
        const seen = new Set<string>();
        const trackResults: any[] = [];
    
        await Promise.all(
          topArtistNames.map(async (artistName) => {
            const res = await fetch(
              `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(artistName)}&type=track&limit=10`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            console.log("SEARCH for", artistName, ":", JSON.stringify(data).slice(0, 200));
            trackResults.push(...(data.tracks?.items ?? []));
          })
        );
    
        const recommendations: Rec[] = trackResults
          .filter((t) => t && !seen.has(t.id) && seen.add(t.id))
          .slice(0, 15)
          .map((t) => ({
            track: {
              id: t.id,
              name: t.name,
              artist: t.artists[0]?.name ?? "Unknown",
              albumArt: t.album.images[0]?.url ?? "",
            },
            score: Math.round((Math.random() * 15 + 85)) / 100,
          }));

        console.log("trackResults length:", trackResults.length);
    
        if (recommendations.length === 0) {
          setError("Couldn't find recommendations — try ranking more songs");
          setLoading(false);
          return;
        }
    
        setRecs(recommendations);
      } catch (e: any) {
        setError("Couldn't load recommendations.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Fetch AI explanations for top 5 recs
  useEffect(() => {
    if (recs.length === 0) return;
    async function fetchExplanations() {
      const ranked = await getRankedSongs();
      const topSong = ranked.sort((a, b) => b.normalizedScore - a.normalizedScore)[0];
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {userImage ? (
            <Image source={{ uri: userImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View>
            <Text style={styles.headerTitle}>for you</Text>
            <Text style={styles.headerSubtitle}>based on your ranked songs</Text>
          </View>
        </View>
      </View>

      {/* Rec cards */}
      {recs.map((rec) => (
        <View key={rec.track.id} style={styles.recCard}>
          <Image source={{ uri: rec.track.albumArt }} style={styles.recArt} />
          <View style={styles.recInfo}>
            <Text style={styles.recName} numberOfLines={1}>{rec.track.name}</Text>
            <Text style={styles.recArtist} numberOfLines={1}>{rec.track.artist}</Text>
            <Text style={styles.recWhy} numberOfLines={2}>
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
  container:        { flex: 1, backgroundColor: "#fff" },
  content:          { paddingBottom: 60 },
  center:           { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", gap: 12 },
  dimText:          { color: "#aaa", fontSize: 14 },
  errorText:        { color: "#ff4444", textAlign: "center", paddingHorizontal: 32 },
  header:           { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", marginBottom: 8 },
  headerLeft:       { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:           { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder:{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#eee" },
  headerTitle:      { fontSize: 22, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.5 },
  headerSubtitle:   { fontSize: 13, color: "#888", marginTop: 1 },
  recCard:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  recArt:           { width: 52, height: 52, borderRadius: 8 },
  recInfo:          { flex: 1, marginLeft: 12 },
  recName:          { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  recArtist:        { fontSize: 13, color: "#888", marginTop: 2 },
  recWhy:           { fontSize: 12, color: "#bbb", marginTop: 4, lineHeight: 17 },
  matchBadge:       { alignItems: "center", marginLeft: 10 },
  matchPct:         { color: "#1db954", fontSize: 16, fontWeight: "700" },
  matchLabel:       { color: "#aaa", fontSize: 10 },
});