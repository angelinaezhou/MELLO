import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, Image, FlatList, StyleSheet, Animated, TouchableOpacity, PixelRatio
} from "react-native";
import { BlurView } from "expo-blur";
import { useFocusEffect, useNavigation } from "expo-router";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import { useUser } from "../context/userContext";
import { getRankedSongs, type RankedSong } from "../utils/storage";
import { Alert } from "react-native";
import SongDetails from "../components/SongDetails";
import { removeRankedSong } from "../utils/storage";

const BASE_URL = "https://mello-auth.vercel.app";
const APP_URL = "exp://10.4.151.47:8081";
const UNLOCK_AT = 10;

function ScoreCircle({ score, vibe, locked }: { score: number; vibe: "loved" | "okay" | "dislike"; locked: boolean }) {
  const textColor =
    vibe === "loved" ? "#86BF8E" :
    vibe === "okay" ? "#D9C36A" :
    "#D09175";
  const pd = PixelRatio.get();

  if (locked) {
    return (
      <View style={[styles.scoreBlock]}>
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        <Text style={[styles.scoreBig, {
          color: textColor,
          fontFamily: "FjallaOne_400Regular",
          position: "absolute",
          opacity: 0.30,
          transform: [{ scaleX: 1 + (0.02 / pd) }, { scaleY: 1 + (0.02 / pd) }],
          textShadowColor: textColor,
          textShadowOffset: { width: 0, height: 3 / pd },
          textShadowRadius: 5 / pd,
          zIndex: 5,
        }]}>0</Text>
        <Text style={[styles.scoreBig, {
          color: "#676767",
          fontFamily: "FjallaOne_400Regular",
          opacity: 0.40,
          textShadowColor: "rgba(0, 0, 0, 0.8)",
          textShadowOffset: { width: 0.5 / pd, height: 0 },
          textShadowRadius: 4 / pd,
          zIndex: 6,
        }]}>0</Text>
      </View>
    );
  }

  return (
    <View style={[styles.scoreBlock]}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <Text style={[styles.scoreBig, {
        color: textColor,
        fontFamily: "FjallaOne_400Regular",
        position: "absolute",
        opacity: 0.30,
        transform: [{ scaleX: 1 + (0.02 / pd) }, { scaleY: 1 + (0.02 / pd) }],
        textShadowColor: textColor,
        textShadowOffset: { width: 0, height: 3 / pd },
        textShadowRadius: 5 / pd,
        zIndex: 5,
      }]}>{score.toFixed(0)}</Text>
      <Text style={[styles.scoreBig, {
        color: textColor,
        fontFamily: "FjallaOne_400Regular",
        opacity: 0.8,
        textShadowColor: "rgba(0, 0, 0, 0.8)",
        textShadowOffset: { width: 0.5 / pd, height: 0 },
        textShadowRadius: 4 / pd,
        zIndex: 6,
      }]}>{score.toFixed(0)}</Text>
    </View>
  );
}

export default function Home() {
  const { userName, userImage, connected, setConnected, logout } = useUser();
  const navigation = useNavigation();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [ranked, setRanked] = useState<RankedSong[]>([]);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const unlockAnim = useState(new Animated.Value(0))[0];
  const scoresUnlocked = ranked.length >= UNLOCK_AT;
  const flatListRef = useRef<FlatList>(null);
  const [selectedSong, setSelectedSong] = useState<RankedSong | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress" as any, () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: connected ? undefined : { display: "none" },
    });
  }, [connected]);

  useEffect(() => {
    if (userName) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }
  }, [userName]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const prev = ranked.length;
        const songs = await getRankedSongs();
        const sorted = songs.sort((a, b) => b.normalizedScore - a.normalizedScore);
        setRanked(sorted);

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

  const handleLogin = async () => {
    const result = await WebBrowser.openAuthSessionAsync(
      `${BASE_URL}/api/auth/spotify/start`,
      APP_URL
    );
    if (result.type === "success") {
      const { queryParams } = Linking.parse(result.url);
      if (queryParams?.auth === "success") {
        const token = queryParams.access_token as string;
        await SecureStore.setItemAsync("access_token", token);
        await SecureStore.setItemAsync("refresh_token", queryParams.refresh_token as string ?? "");
        await SecureStore.setItemAsync("expires_in", queryParams.expires_in as string);
        await SecureStore.setItemAsync("stored_at", String(Date.now()));
        setConnected(true);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log out?",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log out",
          style: "destructive",
          onPress: logout,
        },
      ],
      { cancelable: true }
    );
  };

  const handleDelete = (song: RankedSong) => {
    Alert.alert("Remove rating?", `Remove "${song.name}" from your rankings?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          // import removeRankedSong from your storage utils
          await removeRankedSong(song.id);
          setDetailVisible(false);
          setRanked((prev) => prev.filter((s) => s.id !== song.id));
        },
      },
    ]);
  };

  if (!connected) {
    return (
      <View style={styles.hero}>
        <View style={styles.logoRow}>
          <Text style={styles.heroTitle}>mell</Text>
          <Ionicons
            name="play-skip-forward-circle"
            size={32}
            color="#86BF8E"
            style={{ marginLeft: -2, marginTop: 8}}
          />
          <Text style={styles.heroTitle}>.</Text>
        </View>
        <Text style={styles.heroSubtitle}>rank and share your music taste!</Text>
        <TouchableOpacity style={styles.spotifyButton} onPress={handleLogin}>
          <FontAwesome name="spotify" size={20} color="#fff" />
          <Text style={styles.spotifyButtonText}>Connect Spotify</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref = {flatListRef}
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
                  <Text style={styles.headerTitle}>my mello.</Text>
                  <Animated.Text style={[styles.headerSubtitle, { opacity: fadeAnim }]}>
                    {ranked.length} {ranked.length === 1 ? "song" : "songs"} ranked and counting!
                  </Animated.Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleLogout}>
                <Text style={styles.logoutText}>Log out</Text>
              </TouchableOpacity>
            </View>

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
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => {
              setSelectedSong(item); setDetailVisible(true);
          }}>
            <View style={styles.card}>
              <ScoreCircle score={item.normalizedScore} vibe={item.vibe} locked={!scoresUnlocked} />
              <Image source={{ uri: item.albumArt }} style={styles.albumArt} />
              <View style={styles.info}>
                <Text style={[styles.songName, { fontFamily: "Anton" }]}>{item.name}</Text>
                <Text style={[styles.artistName, { fontFamily: "Anton" }]}>{item.artist}</Text>
                {item.review ? (
                  <Text style={styles.review} numberOfLines={3}>"{item.review}"</Text>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      <SongDetails
      song={selectedSong}
      visible={detailVisible}
      onClose={() => setDetailVisible(false)}
      onDelete={handleDelete}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  // Hero (logged out)
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 16,
    paddingHorizontal: 32,
  },
  heroTitle:    { fontSize: 48, fontWeight: "700", color: "#86BF8E", letterSpacing: -1 },
  heroSubtitle: { fontSize: 15, color: "#aaa" },
  spotifyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1db954",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    gap: 10,
    marginTop: 8,
  },
  spotifyButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  logoutText:        { color: "#aaa", fontSize: 13 },

  // Unlock progress
  unlockContainer: { marginHorizontal: 20, marginTop: 16, marginBottom: 4, gap: 8 },
  unlockRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  unlockLabel:     { fontSize: 13, color: "#aaa" },
  unlockCount:     { fontSize: 13, fontWeight: "700", color: "#86BF8E" },
  unlockTrack:     { height: 4, backgroundColor: "#f0f0f0", borderRadius: 2 },
  unlockFill:      { height: "100%" as any, backgroundColor: "#86BF8E", borderRadius: 2 },
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

  // Empty
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
    marginBottom: 16,
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
  scoreBig:  { fontSize: 108, fontWeight: "800", color: "#1a1a1a", textAlign: "center", fontFamily: "FjallaOne_400Regular", marginLeft: -1 },
  lockEmoji: { fontSize: 20 },
  albumArt:  { width: 120, height: 120, marginLeft: -115, zIndex: 0, borderRadius: 15 },
  info: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 4,
    justifyContent: "center",
    zIndex: 0,
    fontFamily: "Anton",
  },
  songName:   { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  artistName: { fontSize: 13, color: "#888" },
  review:     { fontSize: 12, color: "#aaa", fontStyle: "italic", marginTop: 2 },
  genreRow:   { flexDirection: "row", gap: 6, marginTop: 4 },
  genreTag:   { backgroundColor: "#f5f5f5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  genreText:  { fontSize: 11, color: "#aaa", textTransform: "capitalize" },
  logoRow:    { flexDirection: "row", alignItems: "center" }
});