import { useEffect, useState } from "react";
import {
  View, Text, Image, FlatList,
  TouchableOpacity, StyleSheet
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import type { EloEntry } from "./queue";

export default function Rankings() {
  const router = useRouter();
  const [ranked, setRanked] = useState<EloEntry[]>([]);

  useEffect(() => {
    async function load() {
      const saved = await SecureStore.getItemAsync("elo_scores");
      if (!saved) return;
      const map: Record<string, EloEntry> = JSON.parse(saved);
      setRanked(Object.values(map).sort((a, b) => b.eloScore - a.eloScore));
    }
    load();
  }, []);

  if (!ranked.length) return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No rankings yet</Text>
      <Text style={styles.emptySubtitle}>Head to "To Rank" to start ranking your songs</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Rankings</Text>
      <FlatList
        data={ranked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push({
              pathname: "/recs",
              params: {
                songId: item.id,
                songName: item.name,
                artist: item.artist,
                albumArt: item.albumArt,
                rank: String(index + 1),
                eloScore: String(item.eloScore),
                audioFeatures: JSON.stringify(item.audioFeatures),
              }
            })}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.rank,
              index === 0 && { color: "#FFB800" },
              index === 1 && { color: "#aaa" },
              index === 2 && { color: "#cd7f32" },
            ]}>#{index + 1}</Text>
            <Image source={{ uri: item.albumArt }} style={styles.albumArt} />
            <View style={styles.info}>
              <Text style={styles.songName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.artistName} numberOfLines={1}>{item.artist}</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{item.eloScore}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#fff", paddingTop: 60 },
  empty:        { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 40 },
  emptyTitle:   { color: "#1a1a1a", fontSize: 18, fontWeight: "700" },
  emptySubtitle:{ color: "#aaa", fontSize: 14, textAlign: "center" },
  header:       { color: "#1a1a1a", fontSize: 28, fontWeight: "700", paddingHorizontal: 20, marginBottom: 16, letterSpacing: -0.5 },
  row:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  rank:         { color: "#1db954", fontSize: 15, fontWeight: "700", width: 36 },
  albumArt:     { width: 52, height: 52, borderRadius: 8 },
  info:         { flex: 1, marginLeft: 12 },
  songName:     { color: "#1a1a1a", fontSize: 15, fontWeight: "600" },
  artistName:   { color: "#aaa", fontSize: 13, marginTop: 2 },
  scoreBadge:   { backgroundColor: "#f5f5f5", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText:    { color: "#1db954", fontSize: 13, fontWeight: "700" },
});