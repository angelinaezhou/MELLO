import { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView,
  StyleSheet, ActivityIndicator
} from "react-native";
import { useSpotifyAuth } from "../hooks/useSpotifyAuth";
import { getRankedSongs } from "../utils/storage";
import { useUser } from "../context/userContext";
import VinylSpinner from "../components/VinylSpinner";

const BASE_URL = "https://mello-auth.vercel.app";


type Rec = {
  track: { id: string; name: string; artist: string; albumArt: string };
  score: number;
  explanation?: string;
};

export default function Recs() {
  const { getValidToken } = useSpotifyAuth();
  const { userImage, userId } = useUser();
  const [recs, setRecs] = useState<Rec[]>([]);
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

       const topSongs = ranked
        .sort((a, b) => b.eloScore - a.eloScore)
        .slice(0, 10)
        .map(s => ({ id: s.id, name: s.name, artist: s.artist }));

        const res = await fetch(`${BASE_URL}/api/openai/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topSongs, token, userId }),
        });

        console.log("STATUS:", res.status);
        const text = await res.text();
        console.log("RAW RESPONSE:", text);
        const data = JSON.parse(text);
        setRecs(data.recommendations ?? []);
      } catch (e: any) {
        console.log("ERROR:", e.message);
        setError("Couldn't load recommendations.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <View style={styles.center}>
      <VinylSpinner size={40} color="#1db954" />
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

      {recs.map((rec) => (
        <View key={rec.track.id} style={styles.recCard}>
          <Image source={{ uri: rec.track.albumArt }} style={styles.recArt} />
          <View style={styles.recInfo}>
            <Text style={styles.recName} numberOfLines={1}>{rec.track.name}</Text>
            <Text style={styles.recArtist} numberOfLines={1}>{rec.track.artist}</Text>
            <Text style={styles.recWhy} numberOfLines={2}>
              {rec.explanation ?? "Matches your taste profile."}
            </Text>
            <View style={{ height: 3, backgroundColor: "#f0f0f0", borderRadius: 2, marginTop: 6 }}>
              <View style={{
                height: "100%",
                width: `${Math.round(rec.score * 100)}%` as any,
                backgroundColor: rec.score > 0.75 ? "#1db954" : rec.score > 0.65 ? "#FFB800" : "#aaa",
                borderRadius: 2
              }} />
            </View>
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