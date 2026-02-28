import React, { useEffect, useState } from "react";
import {
  View, Text, Image, FlatList,
  TouchableOpacity, StyleSheet
} from "react-native";
import { useUser, UserProvider } from "../context/userContext";
import { getRankedSongs, type RankedSong } from "../utils/storage";

function ScoreCircle({ score, vibe }: { score: number; vibe: "loved" | "okay" | "dislike" }) {
  const color =
    vibe === "loved" ? "#b7f5c4" :
    vibe === "okay" ? "#fef08a" :
    "#fecaca";

  return (
    <View style={[styles.scoreCircle, { backgroundColor: color }]}>
      <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
    </View>
  );
}

export default function Rankings() {
  const { userImage } = useUser();
  const [ranked, setRanked] = useState<RankedSong[]>([]);

  useEffect(() => {
    async function load() {
      const songs = await getRankedSongs();
      setRanked(songs.sort((a, b) => b.normalizedScore - a.normalizedScore));
    }
    load();
  }, []);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      data={ranked}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 40 }}
      ListHeaderComponent={
        <View>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {userImage ? (
                <Image source={{ uri: userImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
              <View>
                <Text style={styles.headerTitle}>my rankings</Text>
                <Text style={styles.headerSubtitle}>
                  {ranked.length} {ranked.length === 1 ? "song" : "songs"} ranked
                </Text>
              </View>
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No rankings yet</Text>
          <Text style={styles.emptySubtitle}>
            Head to Add to start ranking your songs
          </Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={styles.row}>
          {/* Rank number */}
          <Text style={[
            styles.rank,
            index === 0 && { color: "#FFB800" },
            index === 1 && { color: "#aaa" },
            index === 2 && { color: "#cd7f32" },
          ]}>
            #{index + 1}
          </Text>

          {/* Album art */}
          <Image source={{ uri: item.albumArt }} style={styles.albumArt} />

          {/* Song info */}
          <View style={styles.info}>
            <Text style={styles.songName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.artistName} numberOfLines={1}>{item.artist}</Text>
            {item.review ? (
              <Text style={styles.review} numberOfLines={2}>{item.review}</Text>
            ) : null}
            {/* Genres */}
            {item.genres?.length > 0 && (
              <View style={styles.genreRow}>
                {item.genres.slice(0, 2).map((g) => (
                  <View key={g} style={styles.genreTag}>
                    <Text style={styles.genreText}>{g}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Score circle */}
          <ScoreCircle score={item.normalizedScore} vibe={item.vibe} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: "#eee",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 12,
  },
  rank: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1db954",
    width: 32,
  },
  albumArt: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  songName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  artistName: {
    fontSize: 13,
    color: "#888",
  },
  review: {
    fontSize: 12,
    color: "#aaa",
    fontStyle: "italic",
    marginTop: 2,
  },
  genreRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  genreTag: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  genreText: {
    fontSize: 11,
    color: "#aaa",
    textTransform: "capitalize",
  },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
  },
});