import React, { useEffect, useRef } from "react";
import {
  View, Text, Image, StyleSheet, Animated,
  TouchableOpacity, ScrollView, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { type RankedSong } from "../utils/storage";

const { width } = Dimensions.get("window");

type Props = {
  song: RankedSong | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (song: RankedSong) => void;
};

const VIBE_LABEL: Record<string, string> = {
  loved: "i loved it!",
  okay: "it was okay.",
  dislike: "not for me.",
};

const VIBE_COLOR: Record<string, string> = {
  loved: "#86BF8E",
  okay: "#D9C36A",
  dislike: "#D09175",
};

const PLACEHOLDER_FRIENDS = [
  { name: "alex", avatar: null, score: 82, vibe: "loved" },
  { name: "jordan", avatar: null, score: 61, vibe: "okay" },
  { name: "sam", avatar: null, score: 44, vibe: "dislike" },
];

export default function SongDetails({ song, visible, onClose, onDelete }: Props) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 68,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: width,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!song) return null;

  const vibeColor = VIBE_COLOR[song.vibe] ?? "#aaa";
  const vibeLabel = VIBE_LABEL[song.vibe] ?? song.vibe;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX: slideAnim }] },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* Back button row */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#1a1a1a" />
          <Text style={styles.backText}>back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Album art + blurred background */}
        <View style={styles.artWrapper}>
          <Image
            source={{ uri: song.albumArt }}
            style={styles.bgBlur}
            blurRadius={30}
          />
          <View style={styles.artOverlay} />
          <Image source={{ uri: song.albumArt }} style={styles.albumArt} />
        </View>

        {/* Song info */}
        <View style={styles.infoSection}>
          <Text style={styles.songName}>{song.name}</Text>
          <Text style={styles.artistName}>{song.artist}</Text>

          {/* Vibe + score row */}
          <View style={styles.vibeRow}>
            <View style={[styles.vibeTag, { backgroundColor: vibeColor + "22", borderColor: vibeColor + "55" }]}>
              <View style={[styles.vibeDot, { backgroundColor: vibeColor }]} />
              <Text style={[styles.vibeText, { color: vibeColor }]}>{vibeLabel}</Text>
            </View>
            <View style={styles.scorePill}>
              <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
              <Text style={[styles.scoreText, { color: vibeColor }]}>
                {song.normalizedScore.toFixed(0)}
              </Text>
            </View>
          </View>

          {/* Review / quote */}
          {song.review ? (
            <View style={styles.reviewCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#aaa" style={{ marginTop: 2 }} />
              <Text style={styles.reviewText}>"{song.review}"</Text>
            </View>
          ) : (
            <View style={styles.reviewCard}>
              <Text style={styles.noReview}>no review written</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Friends section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FRIENDS' RATINGS</Text>
          <Text style={styles.sectionSub}>coming soon — invite friends to compare!</Text>

          {PLACEHOLDER_FRIENDS.map((f) => {
            const fc = VIBE_COLOR[f.vibe];
            return (
              <View key={f.name} style={styles.friendRow}>
                <View style={styles.friendAvatar}>
                  <Text style={styles.friendInitial}>{f.name[0].toUpperCase()}</Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{f.name}</Text>
                  <View style={[styles.friendVibeTag, { backgroundColor: fc + "22" }]}>
                    <Text style={[styles.friendVibeText, { color: fc }]}>{VIBE_LABEL[f.vibe]}</Text>
                  </View>
                </View>
                <Text style={[styles.friendScore, { color: fc }]}>{f.score}</Text>
              </View>
            );
          })}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Delete */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.deleteBtn}
            activeOpacity={0.8}
            onPress={() => onDelete(song)}
          >
            <Ionicons name="trash-outline" size={16} color="#D09175" />
            <Text style={styles.deleteText}>Remove this rating</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    zIndex: 50,
  },
  topBar: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  scroll: {
    paddingBottom: 20,
  },
  artWrapper: {
    width: "100%",
    height: 280,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  bgBlur: {
    position: "absolute",
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  artOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  albumArt: {
    width: 170,
    height: 170,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 6,
  },
  songName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.5,
    fontFamily: "Anton",
  },
  artistName: {
    fontSize: 15,
    color: "#888",
    fontFamily: "Anton",
    marginBottom: 4,
  },
  vibeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  vibeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  vibeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  vibeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scorePill: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "800",
  },
  reviewCard: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fafafa",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  reviewText: {
    flex: 1,
    fontSize: 14,
    color: "#555",
    fontStyle: "italic",
    lineHeight: 20,
  },
  noReview: {
    fontSize: 13,
    color: "#ccc",
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 24,
    marginVertical: 24,
  },
  section: {
    paddingHorizontal: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#aaa",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionSub: {
    fontSize: 12,
    color: "#ccc",
    marginTop: -4,
    marginBottom: 4,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fafafa",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  friendInitial: {
    fontSize: 14,
    fontWeight: "700",
    color: "#aaa",
  },
  friendInfo: {
    flex: 1,
    gap: 4,
  },
  friendName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  friendVibeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  friendVibeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  friendScore: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "FjallaOne_400Regular",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#D09175" + "44",
    backgroundColor: "#D09175" + "0a",
    justifyContent: "center",
  },
  deleteText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D09175",
  },
});