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
      <Text style={styles.emptyText}>No rankings yet — head to "To Rank" first</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Rankings</Text>
      <FlatList
        data={ranked}
        keyExtractor={(item) => item.id}
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
            <Text style={styles.rank}>#{index + 1}</Text>
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
  container:  { flex: 1, backgroundColor: "#191414", paddingTop: 60 },
  empty:      { flex: 1, backgroundColor: "#191414", alignItems: "center", justifyContent: "center" },
  emptyText:  { color: "#888", textAlign: "center", paddingHorizontal: 32 },
  header:     { color: "#FFFFFF", fontSize: 24, fontWeight: "700", paddingHorizontal: 20, marginBottom: 16 },
  row:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#222" },
  rank:       { color: "#1DB954", fontSize: 16, fontWeight: "700", width: 36 },
  albumArt:   { width: 48, height: 48, borderRadius: 6 },
  info:       { flex: 1, marginLeft: 12 },
  songName:   { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  artistName: { color: "#B3B3B3", fontSize: 13, marginTop: 2 },
  scoreBadge: { backgroundColor: "#282828", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText:  { color: "#1DB954", fontSize: 13, fontWeight: "700" },
});