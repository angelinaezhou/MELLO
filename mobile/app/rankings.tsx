import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, Image, FlatList, StyleSheet, Animated
} from "react-native";
import { BlurView } from "expo-blur"
import { useFocusEffect } from "expo-router";
import { useUser } from "../context/userContext";
import { getRankedSongs, type RankedSong } from "../utils/storage";

const UNLOCK_AT = 10;

function ScoreCircle({ score, vibe, locked }: { score: number; vibe: "loved" | "okay" | "dislike"; locked: boolean }) {
  const textColor =
    vibe === "loved" ? "#86BF8E" :
    vibe === "okay" ? "#D9C36A" :
    "#D09175";

  if (locked) {
    return (
      <View style={[styles.scoreBlock]}>
      {/* Glass overlay */}
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      {/* Ghost layer for depth */}
      <Text style={[
        styles.scoreBig,
        {
          color: textColor,
          fontFamily: "FjallaOne_400Regular",
          position: "absolute",
          opacity: 0.30,
          transform: [{ scaleX: 1.02 }, { scaleY: 1.02 }],
          textShadowColor: textColor,
          textShadowOffset: { width: 0, height: 3 },
          textShadowRadius: 5,
          zIndex: 5,
        }
      ]}>
        0
      </Text>

      {/* Main text */}
      <Text style={[
        styles.scoreBig,
        {
          color: "676767",
          fontFamily: "FjallaOne_400Regular",
          opacity: 0.80,
          textShadowColor: "rgba(0, 0, 0, 0.8)",  // white border glow
          textShadowOffset: { width: 0.5, height: 0 },
          textShadowRadius: 4,
          zIndex: 6,
        }
      ]}>
        0
      </Text>
    </View>
    );
  }

  return (
    <View style={[styles.scoreBlock]}>
      {/* Glass overlay */}
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      {/* Ghost layer for depth */}
      <Text style={[
        styles.scoreBig,
        {
          color: textColor,
          fontFamily: "FjallaOne_400Regular",
          position: "absolute",
          opacity: 0.30,
          transform: [{ scaleX: 1.02 }, { scaleY: 1.02 }],
          textShadowColor: textColor,
          textShadowOffset: { width: 0, height: 3 },
          textShadowRadius: 5,
          zIndex: 5,
        }
      ]}>
        {score.toFixed(0)}
      </Text>

      {/* Main text */}
      <Text style={[
        styles.scoreBig,
        {
          color: textColor,
          fontFamily: "FjallaOne_400Regular",
          opacity: 0.80,
          textShadowColor: "rgba(0, 0, 0, 0.8)",  // white border glow
          textShadowOffset: { width: 0.5, height: 0 },
          textShadowRadius: 4,
          zIndex: 6,
        }
      ]}>
        {score.toFixed(0)}
      </Text>
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
        keyExtractor={(item, index) => `${item.id}-${index}`}
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
          <View style={styles.card}>
            {/* Big score on left */}
            <ScoreCircle
              score={item.normalizedScore}
              vibe={item.vibe}
              locked={!scoresUnlocked}
            />
        
            {/* Album art overlapping */}
            <Image source={{ uri: item.albumArt }} style={styles.albumArt} />
        
            {/* Text block */}
            <View style={styles.info}>
              <Text style={[styles.songName, {fontFamily: "Anton"}]} >{item.name}</Text>
              <Text style={[styles.artistName, {fontFamily: "Anton"}]}>{item.artist}</Text>
              {item.review ? (
                <Text style={styles.review} numberOfLines={3}>"{item.review}"</Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
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

  // Unlock progress
  unlockContainer: { marginHorizontal: 20, marginTop: 16, marginBottom: 4, gap: 8 },
  unlockRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  unlockLabel:     { fontSize: 13, color: "#aaa" },
  unlockCount:     { fontSize: 13, fontWeight: "700", color: "#1db954" },
  unlockTrack:     { height: 4, backgroundColor: "#f0f0f0", borderRadius: 2 },
  unlockFill:      { height: "100%" as any, backgroundColor: "#1db954", borderRadius: 2 },
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
  unlockText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Empty state
  empty:         { alignItems: "center", justifyContent: "center", paddingTop: 120, gap: 8, paddingHorizontal: 40 },
  emptyTitle:    { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  emptySubtitle: { fontSize: 14, color: "#aaa", textAlign: "center" },

  // Card
  card: {
    width: 367,
    height: 156,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderColor: "#fff",
    borderWidth: 2,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
    marginBottom: 16
  },
  scoreBlock: {
    width: 175,
    height: "100%" as any,
    alignItems: "flex-start",
    marginLeft: 15,
    justifyContent: "center",
  },
  scoreLocked: {
    width: 114,
    height: "100%" as any,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  scoreBig:  { fontSize: 108, fontWeight: "800", color: "#1a1a1a", textAlign: "center", fontFamily: "FjallaOne_400Regular", marginLeft: -1},
  lockEmoji: { fontSize: 20 },
  albumArt:  { width: 120, height: 120, marginLeft: -120, zIndex: 0, borderRadius: 15},
  info: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 4,
    justifyContent: "center",
    zIndex: 0,
    borderBlockColor: "888", 
    fontFamily: "Anton"
  },
  songName:   { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  artistName: { fontSize: 13, color: "#888" },
  review:     { fontSize: 12, color: "#aaa", fontStyle: "italic", marginTop: 2 },
  genreRow:   { flexDirection: "row", gap: 6, marginTop: 4 },
  genreTag:   { backgroundColor: "#f5f5f5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  genreText:  { fontSize: 11, color: "#aaa", textTransform: "capitalize" },
  glassShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
});