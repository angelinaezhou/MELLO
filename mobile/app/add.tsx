import { useEffect, useState, useRef } from "react";
import React from "react";
import {
  View, Text, Image, StyleSheet,
  FlatList, ActivityIndicator, TextInput, TouchableOpacity, Modal, 
} from "react-native";
import { useNavigation } from "expo-router";
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
import VinylSpinner from "../components/VinylSpinner";

type Vibe = "loved" | "okay" | "dislike";

type HeadToHead = {
  newSong: RankedSong;
  candidates: RankedSong[];
  candidateIndex: number;
  completed: number;
  totalNeeded: number;
  seenOpponentIds: Set<string>;
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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const h2hLockedRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resultSong, setResultSong] = useState<RankedSong | null>(null);
  const [resultVisible, setResultVisible] = useState(false);


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
  
    let cancelled = false;
  
    const timeout = setTimeout(async () => {
      setSearching(true);
  
      try {
        const token = await SecureStore.getItemAsync("access_token");
        if (!token) {
          console.log("No access token found");
          return;
        }
  
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery.trim())}&type=track&limit=10`;

        setSearchError(null);
  
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Token:", token?.slice(0, 20));
        console.log("Response status:", res.status);

  
        // 🔥 IMPORTANT: don’t silently ignore bad statuses
        if (!res.ok) {
          const text = await res.text();
          setSearchError(`Spotify error ${res.status}: ${text.slice(0, 120)}`);
          setSearchResults([]);
          return;
        }
  
        const data = await res.json();
  
        const results: QueuedSong[] = (data.tracks?.items ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          artist: t.artists.map((a: any) => a.name).join(", "),
          artistId: t.artists[0]?.id ?? "",
          albumArt: t.album.images?.[0]?.url ?? "",
          bookmarked: bookmarkedIds.has(t.id),
        }));
  
        if (!cancelled) setSearchResults(results);
      } catch (e) {
        console.log("Search threw error:", e);
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);
  
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery, bookmarkedIds]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress" as any, () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

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
    const totalNeeded = Math.min(needed, existing.length);

    if (needed === 0) {
      await addRankedSong(newSong);
      setAddedIds((prev) => new Set([...prev, song.id]));
      return;
    }

    const candidates = [...existing].sort(
      (a, b) =>
        Math.abs(a.eloScore - newSong.eloScore) - Math.abs(b.eloScore - newSong.eloScore)
    );

    // Pick opponents — songs closest in ELO to the new song
    const firstOpponent = candidates[0];
    setHeadToHead({
      newSong,
      candidates,
      candidateIndex: 0,
      completed: 0,
      totalNeeded: needed,
      seenOpponentIds: new Set(firstOpponent ? [firstOpponent.id] : []),
    });
    setH2hLeft(newSong);
    setH2hRight(firstOpponent ?? null);
  };

  const handleH2HPick = async (winner: RankedSong, loser: RankedSong) => {
    if (!headToHead) return;
  
    if (h2hLockedRef.current) return;
    h2hLockedRef.current = true;
  
    try {
      const { newWinner, newLoser } = calcElo(winner.eloScore, loser.eloScore);
  
      const updatedNew =
        winner.id === headToHead.newSong.id
          ? { ...headToHead.newSong, eloScore: newWinner, matchups: headToHead.newSong.matchups + 1 }
          : { ...headToHead.newSong, eloScore: newLoser, matchups: headToHead.newSong.matchups + 1 };
  
      const completedNext = headToHead.completed + 1;
  
      // ✅ finished required comparisons
      if (completedNext >= headToHead.totalNeeded) {
        setIsFinalizing(true);
  
        await addRankedSong(updatedNew);
  
        try {
          const allRanked = await getRankedSongs();
          const sorted = allRanked
            .sort((a, b) => b.eloScore - a.eloScore)
            .slice(0, 10)
            .map(({ id, name, artist, eloScore }) => ({ id, name, artist, eloScore }));
  
          await fetch("https://mello-auth.vercel.app/api/memory/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: userId ?? "anonymous",
              topTracks: sorted,
            }),
          });
        } catch (err) {
          console.log("Memory save skipped:", err);
        }
        setResultSong(updatedNew);
        setResultVisible(true);
  
        setAddedIds((prev) => new Set([...prev, updatedNew.id]));
        setHeadToHead(null);
        setH2hLeft(null);
        setH2hRight(null);
  
        setIsFinalizing(false);
        return;
      }
  
      // re-sort after each matchup instead of initial group
      const tempH2H: HeadToHead = {
        ...headToHead,
        newSong: updatedNew,
        completed: completedNext,
        // re-sort candidates by closeness to updated ELO each round
        candidates: [...headToHead.candidates].sort(
          (a, b) =>
            Math.abs(a.eloScore - updatedNew.eloScore) -
            Math.abs(b.eloScore - updatedNew.eloScore)
        ),
        candidateIndex: -1, // reset so getNextOpponent starts from 0
      };
  
      const next = getNextOpponent(tempH2H);
  
      if (!next) {
        // rare: no more unseen opponents; fall back to allowing repeats or just keep current
        // simplest: keep current opponent but let them pick again (not ideal)
        setHeadToHead(tempH2H);
        setH2hLeft(updatedNew);
        return;
      }
  
      const newSeen = new Set(tempH2H.seenOpponentIds);
      newSeen.add(next.opponent.id);
  
      const updated = {
        ...tempH2H,
        candidateIndex: next.index,
        seenOpponentIds: newSeen,
      };
  
      setHeadToHead(updated);
      setH2hLeft(updatedNew);
      setH2hRight(next.opponent);
    } finally {
      h2hLockedRef.current = false;
    }
  };

  const getNextOpponent = (h2h: HeadToHead) => {
    for (let i = h2h.candidateIndex + 1; i < h2h.candidates.length; i++) {
      const cand = h2h.candidates[i];
      if (!h2h.seenOpponentIds.has(cand.id)) {
        return { opponent: cand, index: i };
      }
    }
    return null;
  };

  const handleH2HSkip = () => {
    if (!headToHead) return;
    if (h2hLockedRef.current) return;
    h2hLockedRef.current = true;
  
    try {
      const next = getNextOpponent(headToHead);
  
      if (!next) {
        // If they somehow saw everyone, you can either:
        // (a) disable skip, or (b) allow repeats. I’d disable skip.
        return;
      }
  
      const newSeen = new Set(headToHead.seenOpponentIds);
      newSeen.add(next.opponent.id);
  
      const updated = {
        ...headToHead,
        candidateIndex: next.index,
        seenOpponentIds: newSeen,
      };
  
      setHeadToHead(updated);
      setH2hLeft(updated.newSong);
      setH2hRight(next.opponent);
    } finally {
      h2hLockedRef.current = false;
    }
  };

  const visibleTop50 = top50.filter((s) => !addedIds.has(s.id) && !bookmarkedIds.has(s.id));
  const visibleBookmarks = bookmarks.filter((s) => !addedIds.has(s.id));
  const noMoreOpponents = headToHead ? getNextOpponent(headToHead) === null : false;

  // Head-to-head screen
  if (headToHead && h2hLeft && h2hRight) {
    const total = headToHead.totalNeeded;
    const shown = Math.min(headToHead.completed + 1, total); // shows “1/6” on first question
    const progress = total === 0 ? 0 : headToHead.completed / total;
    return (
      <View style={styles.h2hContainer}>
        <Text style={styles.h2hTitle}>Which do you prefer?</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.dimText}>
          {headToHead.completed} / {total}
        </Text>

        <View style={styles.cards}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleH2HPick(h2hLeft, h2hRight)}
            activeOpacity={0.8}
            disabled={isFinalizing}
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
            disabled={isFinalizing}
          >
            <Image source={{ uri: h2hRight.albumArt }} style={styles.cardArt} />
            <Text style={styles.cardSong} numberOfLines={2}>{h2hRight.name}</Text>
            <Text style={styles.cardArtist} numberOfLines={1}>{h2hRight.artist}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={handleH2HSkip}
          disabled={isFinalizing || noMoreOpponents}
          style={styles.skipButton}
          activeOpacity={0.8}
        >
          <Text style={[styles.skipText, noMoreOpponents && { opacity: 0.4 }]}>Skip this pair</Text>
        </TouchableOpacity>
        {noMoreOpponents && (
          <Text style={styles.skipHint}>No more songs to swap in - choose one to continue.</Text>
        )}
        <Modal transparent visible={isFinalizing} animationType="fade">
          <View style={styles.blockingOverlay}>
            <View style={styles.blockingCard}>
              <VinylSpinner size={40} color="#1db954" />
              <Text style={styles.blockingTitle}>Saving your ranking…</Text>
              <Text style={styles.blockingSubtitle}>hold on tight..</Text>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const sections = [
    { type: "header" },
    { type: "search" },
    ...(searchQuery.trim()
      ? [
        { type: "sectionLabel", label: "Search results" },

        ...(searchError
          ? [{ type: "searchError", message: searchError }]
          : []),

        ...(searching
          ? [{ type: "searching" }]
          : searchResults.map((s) => ({ type: "song", song: s, source: "search" }))),
      ]
      : [
          ...(visibleBookmarks.length > 0
            ? [
                { type: "sectionLabel", label: "BOOKMARKS" },
                ...visibleBookmarks.map((s) => ({ type: "song", song: s, source: "bookmark" })),
              ]
            : []),
          { type: "sectionLabel", label: "YOUR TOP SPOTIFY SONGS" },
          ...visibleTop50.map((s, i) => ({ type: "song", song: s, source: "top50" })),
        ]),
  ];

  return (
    <View style={{flex: 1}}>
      <FlatList
        ref = {flatListRef}
        data={sections}
        keyExtractor={(_, i) => String(i)}
        style={{ flex: 1, backgroundColor: "#fff" }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }: { item: any }) => {
          if (item.type === "searchError") {
            return (
              <Text style={{
                color: "#d00",
                fontSize: 12,
                paddingHorizontal: 20,
                paddingVertical: 8,
              }}>
                {item.message}
              </Text>
            );
          }
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
                    <Text style={styles.headerSubtitle}>find new tracks to rank!</Text>
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
                <VinylSpinner size={30} color="#1db954" />
              </View>
            );
          }

          if (item.type === "song") {
            return (
              <SongCard
                song={item.song}
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
      <Modal transparent visible={isFinalizing} animationType="fade">
        <View style={styles.blockingOverlay}>
          <View style={styles.blockingCard}>
            <ActivityIndicator size="large" color="#1db954" />
            <Text style={styles.blockingTitle}>Saving your ranking…</Text>
            <Text style={styles.blockingSubtitle}>Just a sec</Text>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={resultVisible} animationType="fade">
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <Image source={{ uri: resultSong?.albumArt }} style={styles.resultArt} />
            <Text style={styles.resultName} numberOfLines={2}>{resultSong?.name}</Text>
            <Text style={styles.resultArtist}>{resultSong?.artist}</Text>
            <View style={[styles.resultScorePill, { borderColor: resultSong?.vibe ? VIBE_COLOR[resultSong.vibe] : "#aaa" }]}>
              <Text style={[styles.resultScore, { color: resultSong?.vibe ? VIBE_COLOR[resultSong.vibe] : "#aaa" }]}>
                {resultSong?.normalizedScore.toFixed(0)}
              </Text>
            </View>
            <TouchableOpacity style={styles.resultBtn} onPress={() => setResultVisible(false)}>
              <Text style={styles.resultBtnText}>nice!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const VIBE_COLOR: Record<string, string> = {
  loved: "#86BF8E",
  okay: "#D9C36A",
  dislike: "#D09175",
};

const styles = StyleSheet.create({
  header:           { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerLeft:       { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:           { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder:{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#eee" },
  headerTitle:      { fontSize: 24, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.5 },
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
  card:             { flex: 1, backgroundColor: "#fff", borderRadius: 20, paddingVertical: 24, paddingHorizontal: 12, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardArt:          { width: "100%", aspectRatio: 1, borderRadius: 14, marginBottom: 10 },
  cardSong:         { color: "#1a1a1a", fontSize: 15, fontWeight: "500", textAlign: "center", marginBottom: 4, fontFamily: "Anton" },
  cardArtist:       { color: "#aaa", fontSize: 12, textAlign: "center", fontFamily: "Anton" },
  vs:               { color: "#1db954", fontSize: 18, fontWeight: "800" },
  blockingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  blockingCard: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  blockingTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  blockingSubtitle: {
    paddingVertical: 4,
    marginBottom: 2,
    fontSize: 13,
    color: "#888",
  },
  skipButton: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#f5f5f5",
  },
  skipText: {
    color: "#888",
    fontWeight: "700",
    fontSize: 13,
  },
  skipHint: {
    marginTop: 16,
    color: "#888",
    fontWeight: "700",
    fontSize: 13,
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultCard: {
    width: "78%",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  resultArt: {
    width: 120,
    height: 120,
    borderRadius: 14,
    marginBottom: 8,
  },
  resultName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    fontFamily: "Anton",
    letterSpacing: -0.5,
  },
  resultArtist: {
    fontSize: 13,
    color: "#888",
    fontFamily: "Anton",
  },
  resultScorePill: {
    marginTop: 8,
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  resultScore: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "FjallaOne_400Regular",
  },
  resultBtn: {
    marginTop: 12,
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
  resultBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});