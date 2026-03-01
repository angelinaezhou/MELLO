import { useEffect, useState, useCallback } from "react";
import {
  View, Text, Image, StyleSheet,
  FlatList, ActivityIndicator, TextInput, TouchableOpacity
} from "react-native";
import { Ionicons } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store";
import { useUser } from "../context/userContext";
import SongCard from "../components/SongCard";
import ReviewModal from "../components/ReviewModal";
import {
  getBookmarks, toggleBookmark, getAddedIds,
  addRankedSong, getRankedSongs, type QueuedSong, type RankedSong
} from "../utils/storage";
import { startingElo, matchupsNeeded, calcElo } from "../utils/elo";

type Vibe = "loved" | "okay" | "dislike";

type HeadToHead = {
  newSong: RankedSong;
  opponents: RankedSong[];
  currentIndex: number;
};

export default function Add() {
  const { userImage, userId } = useUser();
  const [top50, setTop50] = useState<QueuedSong[]>([]);
  const [bookmarks, setBookmarks] = useState<QueuedSong[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<QueuedSong[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<QueuedSong | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [headToHead, setHeadToHead] = useState<HeadToHead | null>(null);
  const [h2hLeft, setH2hLeft] = useState<RankedSong | null>(null);
  const [h2hRight, setH2hRight] = useState<RankedSong | null>(null);

  useEffect(() => {
    async function init() {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) { setLoading(false); return; }

      const [res, savedBookmarks, savedAddedIds] = await Promise.all([
        fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        getBookmarks(),
        getAddedIds(),
      ]);

      const data = await res.json();
      const bIds = new Set(savedBookmarks.map((s) => s.id));

      const mapped: QueuedSong[] = (data.items ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artists.map((a: any) => a.name).join(", "),
        artistId: t.artists[0]?.id ?? "",
        albumArt: t.album.images[0]?.url ?? "",
        bookmarked: bIds.has(t.id),
      }));

      setTop50(mapped);
      setBookmarks(savedBookmarks);
      setBookmarkedIds(bIds);
      setAddedIds(savedAddedIds);
      setLoading(false);
    }
    init();
  }, []);

  // Search Spotify
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const token = await SecureStore.getItemAsync("access_token");
        if (!token) return;
        const res = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        const results: QueuedSong[] = (data.tracks?.items ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          artist: t.artists.map((a: any) => a.name).join(", "),
          artistId: t.artists[0]?.id ?? "",
          albumArt: t.album.images[0]?.url ?? "",
          bookmarked: bookmarkedIds.has(t.id),
        }));
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleBookmark = async (song: QueuedSong) => {
    const updated = await toggleBookmark(song);
    const ids = new Set(updated.map((s) => s.id));
    setBookmarks(updated);
    setBookmarkedIds(ids);
  };

  const handleSongPress = (song: QueuedSong) => {
    setSelectedSong(song);
    setModalVisible(true);
  };

  const handleConfirm = async (song: QueuedSong, vibe: Vibe, review: string) => {
    setModalVisible(false);

    const newSong: RankedSong = {
      ...song,
      eloScore: startingElo(vibe),
      normalizedScore: 50,
      review,
      vibe,
      matchups: 0,
      genres: [],
    };

    const existing = await getRankedSongs();
    const needed = matchupsNeeded(existing.length);

    if (needed === 0) {
      await addRankedSong(newSong);
      setAddedIds((prev) => new Set([...prev, song.id]));
      return;
    }

    // Pick opponents — songs closest in ELO to the new song
    const opponents = [...existing]
      .sort((a, b) => Math.abs(a.eloScore - newSong.eloScore) - Math.abs(b.eloScore - newSong.eloScore))
      .slice(0, needed);

    setHeadToHead({ newSong, opponents, currentIndex: 0 });
    setH2hLeft(newSong);
    setH2hRight(opponents[0]);
  };

  const handleH2HPick = async (winner: RankedSong, loser: RankedSong) => {
    if (!headToHead) return;

    const { newWinner, newLoser } = calcElo(winner.eloScore, loser.eloScore);
    const updatedNew = winner.id === headToHead.newSong.id
      ? { ...headToHead.newSong, eloScore: newWinner, matchups: headToHead.newSong.matchups + 1 }
      : { ...headToHead.newSong, eloScore: newLoser, matchups: headToHead.newSong.matchups + 1 };

    const nextIndex = headToHead.currentIndex + 1;

    if (nextIndex >= headToHead.opponents.length) {
  await addRankedSong(updatedNew);

  // ⭐ Supermemory save (NEW)
  try {
    const allRanked = await getRankedSongs();
    const sorted = allRanked.sort((a, b) => b.eloScore - a.eloScore);

await fetch("https://mello-auth.vercel.app/api/memory/save", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: userId ?? "anonymous",
    topTracks: sorted,
  }),
});  } catch (err) {
    console.log("Memory save skipped:", err);
  }

  setAddedIds((prev) => new Set([...prev, updatedNew.id]));
  setHeadToHead(null);
  setH2hLeft(null);
  setH2hRight(null);
  return;
}

    // Next matchup
    const updatedH2H = {
      ...headToHead,
      newSong: updatedNew,
      currentIndex: nextIndex,
    };
    setHeadToHead(updatedH2H);
    setH2hLeft(updatedNew);
    setH2hRight(headToHead.opponents[nextIndex]);
  };

  const visibleTop50 = top50.filter((s) => !addedIds.has(s.id));
  const visibleBookmarks = bookmarks.filter((s) => !addedIds.has(s.id));

  // Head-to-head screen
  if (headToHead && h2hLeft && h2hRight) {
    const progress = headToHead.currentIndex / headToHead.opponents.length;
    return (
      <View style={styles.h2hContainer}>
        <Text style={styles.h2hTitle}>Which do you prefer?</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={styles.dimText}>
          {headToHead.currentIndex} / {headToHead.opponents.length}
        </Text>

        <View style={styles.cards}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleH2HPick(h2hLeft, h2hRight)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: h2hLeft.albumArt }} style={styles.cardArt} />
            <Text style={styles.cardSong} numberOfLines={2}>{h2hLeft.name}</Text>
            <Text style={styles.cardArtist} numberOfLines={1}>{h2hLeft.artist}</Text>
          </TouchableOpacity>

          <Text style={styles.vs}>VS</Text>

          <TouchableOpacity
            style={styles.card}
            onPress={() => handleH2HPick(h2hRight, h2hLeft)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: h2hRight.albumArt }} style={styles.cardArt} />
            <Text style={styles.cardSong} numberOfLines={2}>{h2hRight.name}</Text>
            <Text style={styles.cardArtist} numberOfLines={1}>{h2hRight.artist}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sections = [
    { type: "header" },
    { type: "search" },
    ...(searchQuery.trim()
      ? [
          { type: "sectionLabel", label: "Search results" },
          ...(searching
            ? [{ type: "searching" }]
            : searchResults.map((s) => ({ type: "song", song: s, source: "search" }))),
        ]
      : [
          ...(visibleBookmarks.length > 0
            ? [
                { type: "sectionLabel", label: "Bookmarked" },
                ...visibleBookmarks.map((s) => ({ type: "song", song: s, source: "bookmark" })),
              ]
            : []),
          { type: "sectionLabel", label: "Your top 50" },
          ...visibleTop50.map((s, i) => ({ type: "song", song: s, index: i, source: "top50" })),
        ]),
  ];

  return (
    <View style={{flex: 1}}>
      <FlatList
        data={sections}
        keyExtractor={(_, i) => String(i)}
        style={{ flex: 1, backgroundColor: "#fff" }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }: { item: any }) => {
          if (item.type === "header") {
            return (
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  {userImage ? (
                    <Image source={{ uri: userImage }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder} />
                  )}
                  <View>
                    <Text style={styles.headerTitle}>add songs</Text>
                    <Text style={styles.headerSubtitle}>tap a song to rank it</Text>
                  </View>
                </View>
              </View>
            );
          }

          if (item.type === "search") {
            return (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={16} color="#ccc" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search any song..."
                  placeholderTextColor="#ccc"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={16} color="#ccc" />
                  </TouchableOpacity>
                )}
              </View>
            );
          }

          if (item.type === "sectionLabel") {
            return <Text style={styles.sectionLabel}>{item.label}</Text>;
          }

          if (item.type === "searching") {
            return (
              <View style={styles.center}>
                <ActivityIndicator color="#1db954" />
              </View>
            );
          }

          if (item.type === "song") {
            return (
              <SongCard
                song={item.song}
                index={item.source === "top50" ? item.index : undefined}
                bookmarked={bookmarkedIds.has(item.song.id)}
                onBookmark={handleBookmark}
                onPress={handleSongPress}
              />
            );
          }

          return null;
        }}
      />

      <ReviewModal
        song={selectedSong}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:           { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerLeft:       { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:           { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder:{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#eee" },
  headerTitle:      { fontSize: 22, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.5 },
  headerSubtitle:   { fontSize: 13, color: "#888", marginTop: 1 },
  searchContainer:  { flexDirection: "row", alignItems: "center", margin: 16, backgroundColor: "#f5f5f5", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchIcon:       {},
  searchInput:      { flex: 1, fontSize: 15, color: "#1a1a1a" },
  sectionLabel:     { fontSize: 13, fontWeight: "700", color: "#aaa", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  center:           { paddingVertical: 20, alignItems: "center" },
  h2hContainer:     { flex: 1, backgroundColor: "#fff", alignItems: "center", paddingTop: 80, paddingHorizontal: 16 },
  h2hTitle:         { color: "#1a1a1a", fontSize: 22, fontWeight: "700", marginBottom: 20, letterSpacing: -0.5 },
  progressTrack:    { width: "100%", height: 4, backgroundColor: "#f0f0f0", borderRadius: 2, marginBottom: 8 },
  progressFill:     { height: "100%", backgroundColor: "#1db954", borderRadius: 2 },
  dimText:          { color: "#aaa", fontSize: 13, marginBottom: 32 },
  cards:            { flexDirection: "row", alignItems: "center", gap: 10, width: "100%" },
  card:             { flex: 1, backgroundColor: "#fff", borderRadius: 20, padding: 14, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardArt:          { width: "100%", aspectRatio: 1, borderRadius: 14, marginBottom: 10 },
  cardSong:         { color: "#1a1a1a", fontSize: 14, fontWeight: "600", textAlign: "center", marginBottom: 4 },
  cardArtist:       { color: "#aaa", fontSize: 12, textAlign: "center" },
  vs:               { color: "#1db954", fontSize: 18, fontWeight: "800" },
});