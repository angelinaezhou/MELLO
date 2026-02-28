import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, Image, FlatList, StyleSheet, Animated
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useUser } from "../context/userContext";
import { getRankedSongs, type RankedSong } from "../utils/storage";

const UNLOCK_AT = 10;

function ScoreCircle({ score, vibe, locked }: { score: number; vibe: "loved" | "okay" | "dislike"; locked: boolean }) {
  const color =
    vibe === "loved" ? "#b7f5c4" :
    vibe === "okay" ? "#fef08a" :
    "#fecaca";

  if (locked) {
    return (
      <View style={[styles.scoreCircle, { backgroundColor: "#f5f5f5" }]}>
        <Text style={styles.lockEmoji}>🔒</Text>
      </View>
    );
  }

  return (
    <View style={[styles.scoreCircle, { backgroundColor: color }]}>
      <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
    </View>
  );
}

export default function Rankings() {
  const { userImage } = useUser();
  const [ranked, setRanked] = useState<RankedSong[]>([]);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const unlockAnim = useState(new Animated.Value(0))[0];

  const scoresUnlocked = ranked.length >= UNLOCK_AT;

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const prev = ranked.length;
        const songs = await getRankedSongs();
        const sorted = songs.sort((a, b) => b.normalizedScore - a.normalizedScore);
        setRanked(sorted);

        // Trigger unlock animation if we just hit 10
        if (prev < UNLOCK_AT && sorted.length >= UNLOCK_AT) {
          setJustUnlocked(true);
          Animated.sequence([
            Animated.timing(unlockAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.delay(2000),
            Animated.timing(unlockAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]).start(() => setJustUnlocked(false));
        }
      }
      load();
    }, [ranked.length])
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Unlock banner */}
      {justUnlocked && (
        <Animated.View style={[styles.unlockBanner, { opacity: unlockAnim }]}>
          <Text style={styles.unlockText}>🎉 Scores unlocked!</Text>
        </Animated.View>
      )}

      <FlatList
        style={{ flex: 1, backgroundColor: "#fff" }}
        data={ranked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
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

            {/* Progress bar toward unlock */}
            {!scoresUnlocked && (
              <View style={styles.unlockContainer}>
                <View style={styles.unlockRow}>
                  <Text style={styles.unlockLabel}>🔒 Rank {UNLOCK_AT - ranked.length} more to unlock scores</Text>
                  <Text style={styles.unlockCount}>{ranked.length}/{UNLOCK_AT}</Text>
                </View>
                <View style={styles.unlockTrack}>
                  <View style={[styles.unlockFill, { width: `${(ranked.length / UNLOCK_AT) * 100}%` as any }]} />
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No rankings yet</Text>
            <Text style={styles.emptySubtitle}>Head to Add to start ranking your songs</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={[
              styles.rank,
              index === 0 && { color: "#FFB800" },
              index === 1 && { color: "#aaa" },
              index === 2 && { color: "#cd7f32" },
            ]}>
              #{index + 1}
            </Text>

            <Image source={{ uri: item.albumArt }} style={styles.albumArt} />

            <View style={styles.info}>
              <Text style={styles.songName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.artistName} numberOfLines={1}>{item.artist}</Text>
              {item.review ? (
                <Text style={styles.review} numberOfLines={2}>{item.review}</Text>
              ) : null}
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

            <ScoreCircle
              score={item.normalizedScore}
              vibe={item.vibe}
              locked={!scoresUnlocked}
            />
          </View>
        )}
      />
    </View>
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
  headerLeft:        { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:            { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#eee" },
  headerTitle:       { fontSize: 22, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.5 },
  headerSubtitle:    { fontSize: 13, color: "#888", marginTop: 1 },
  unlockContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    gap: 8,
  },
  unlockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unlockLabel:  { fontSize: 13, color: "#aaa" },
  unlockCount:  { fontSize: 13, fontWeight: "700", color: "#1db954" },
  unlockTrack:  { height: 4, backgroundColor: "#f0f0f0", borderRadius: 2 },
  unlockFill:   { height: "100%", backgroundColor: "#1db954", borderRadius: 2 },
  unlockBanner: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    zIndex: 100,
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  unlockText:   { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty:        { alignItems: "center", justifyContent: "center", paddingTop: 120, gap: 8, paddingHorizontal: 40 },
  emptyTitle:   { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  emptySubtitle:{ fontSize: 14, color: "#aaa", textAlign: "center" },
  row:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f5f5f5", gap: 12 },
  rank:         { fontSize: 13, fontWeight: "700", color: "#1db954", width: 32 },
  albumArt:     { width: 52, height: 52, borderRadius: 8 },
  info:         { flex: 1, gap: 3 },
  songName:     { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  artistName:   { fontSize: 13, color: "#888" },
  review:       { fontSize: 12, color: "#aaa", fontStyle: "italic", marginTop: 2 },
  genreRow:     { flexDirection: "row", gap: 6, marginTop: 4 },
  genreTag:     { backgroundColor: "#f5f5f5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  genreText:    { fontSize: 11, color: "#aaa", textTransform: "capitalize" },
  scoreCircle:  { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  lockEmoji:    { fontSize: 18 },
  scoreText:    { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
});