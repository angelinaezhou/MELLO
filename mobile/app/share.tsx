import { useEffect, useRef, useState } from "react";
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Share, Alert
} from "react-native";
import { useUser } from "../context/userContext";
import { getRankedSongs, type RankedSong } from "../utils/storage";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export default function ShareCard() {
  const { userName, userImage, userId } = useUser();
  const [ranked, setRanked] = useState<RankedSong[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const songs = await getRankedSongs();
        setRanked(songs.sort((a, b) => b.eloScore - a.eloScore).slice(0, 10));
        setLoading(false);
      }
      load();
    }, [])
  );

  const myCode = userId?.slice(0, 8).toUpperCase() ?? "...";

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my music rankings on Mello! 🎵\n\nMy top song: ${ranked[0]?.name ?? "?"} by ${ranked[0]?.artist ?? "?"}\n\nAdd me with code: ${myCode}\n\nGet Mello to rank your music taste`,
      });
    } catch {
      Alert.alert("Couldn't share");
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1db954" />
    </View>
  );

  if (ranked.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>No rankings yet</Text>
      <Text style={styles.emptySubtitle}>Rank some songs first to generate your card</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {userImage ? (
            <Image source={{ uri: userImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View>
            <Text style={styles.headerTitle}>share</Text>
            <Text style={styles.headerSubtitle}>your music identity</Text>
          </View>
        </View>
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardBrand}>mello</Text>
            <Text style={styles.cardUsername}>{userName ?? "music lover"}</Text>
          </View>
          <View style={styles.cardCodeBox}>
            <Text style={styles.cardCodeLabel}>taste code</Text>
            <Text style={styles.cardCode}>{myCode}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Top songs */}
        <Text style={styles.cardSectionLabel}>MY TOP {ranked.length} SONGS</Text>
        {ranked.map((song, index) => (
          <View key={song.id} style={styles.cardRow}>
            <Text style={[
              styles.cardRank,
              index === 0 && { color: "#FFB800" },
              index === 1 && { color: "#aaa" },
              index === 2 && { color: "#cd7f32" },
            ]}>
              {index + 1}
            </Text>
            <Image source={{ uri: song.albumArt }} style={styles.cardAlbumArt} />
            <View style={styles.cardSongInfo}>
              <Text style={styles.cardSongName} numberOfLines={1}>{song.name}</Text>
              <Text style={styles.cardArtistName} numberOfLines={1}>{song.artist}</Text>
            </View>
            <View style={[
              styles.vibeDot,
              { backgroundColor: song.vibe === "loved" ? "#1db954" : song.vibe === "okay" ? "#FFB800" : "#ff4444" }
            ]} />
          </View>
        ))}

        {/* Card footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>mello • rank your music taste</Text>
        </View>
      </View>

      {/* Share button */}
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>Share My Taste</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>Share your taste code so friends can blend music with you</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: "#fff" },
  content:           { paddingBottom: 60 },
  center:            { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle:        { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  emptySubtitle:     { fontSize: 14, color: "#aaa", textAlign: "center" },
  header:            { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", marginBottom: 20 },
  headerLeft:        { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:            { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#eee" },
  headerTitle:       { fontSize: 22, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.5 },
  headerSubtitle:    { fontSize: 13, color: "#888", marginTop: 1 },
  card: {
    marginHorizontal: 20,
    backgroundColor: "#0a0a0a",
    borderRadius: 20,          // was 24
    padding: 16,               // was 24
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },  // was 20
  cardBrand:         { fontSize: 22, fontWeight: "800", color: "#1db954", letterSpacing: -1 },  // was 28
  cardUsername:      { fontSize: 12, color: "#666", marginTop: 2 },
  cardCodeBox:       { alignItems: "flex-end" },
  cardCodeLabel:     { fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  cardCode:          { fontSize: 15, fontWeight: "800", color: "#1db954", letterSpacing: 3 },  // was 18
  divider:           { height: 1, backgroundColor: "#1a1a1a", marginBottom: 10 },  // was 16
  cardSectionLabel:  { fontSize: 10, color: "#444", fontWeight: "700", letterSpacing: 1, marginBottom: 8 },  // was 12
  cardRow:           { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },  // was mb:12 gap:10
  cardRank:          { fontSize: 11, fontWeight: "700", color: "#1db954", width: 16 },
  cardAlbumArt:      { width: 28, height: 28, borderRadius: 5 },  // was 36x36
  cardSongInfo:      { flex: 1 },
  cardSongName:      { fontSize: 12, fontWeight: "600", color: "#fff" },
  cardArtistName:    { fontSize: 10, color: "#666", marginTop: 1 },
  vibeDot:           { width: 6, height: 6, borderRadius: 3 },
  cardFooter:        { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#1a1a1a", alignItems: "center" },  // was mt:20 pt:16
  cardFooterText:    { fontSize: 11, color: "#333", letterSpacing: 0.5 },
  shareButton:       { margin: 20, backgroundColor: "#1db954", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  shareButtonText:   { color: "#fff", fontSize: 16, fontWeight: "700" },
  hint:              { textAlign: "center", color: "#aaa", fontSize: 12, paddingHorizontal: 40 },
});