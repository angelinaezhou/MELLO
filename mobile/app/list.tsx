import { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator, Alert
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useUser } from "../context/userContext";
import { useSpotifyAuth } from "../hooks/useSpotifyAuth";
import { getRankedSongs } from "../utils/storage";

const BASE_URL = "https://mello-auth.vercel.app";

type Rec = {
  track: { id: string; name: string; artist: string; albumArt: string };
  score: number;
  explanation?: string;
};

type Friend = {
  code: string;
  name: string;
  topTracks: any[];
};

export default function Friends() {
  const { userId, userImage, userName } = useUser();
  const { getValidToken } = useSpotifyAuth();
  const [friendCode, setFriendCode] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved friends from SecureStore
  useEffect(() => {
    async function load() {
      const saved = await SecureStore.getItemAsync("friends");
      if (saved) setFriends(JSON.parse(saved));
    }
    load();
  }, []);

  const myCode = userId ?? "...";

  const handleAddFriend = async () => {
    if (!friendCode.trim()) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch(`${BASE_URL}/api/memory/profile?userId=${friendCode.trim().toLowerCase()}`);
      
      if (!res.ok) {
        setError("Friend not found — make sure they've ranked at least one song");
        setAdding(false);
        return;
      }

      const data = await res.json();
      const name = `Friend ${friends.length + 1}`;
      
      const newFriend: Friend = {
        code: friendCode.trim().toLowerCase(),
        name,
        topTracks: data.topTracks ?? [],
      };

      const updated = [...friends, newFriend];
      setFriends(updated);
      await SecureStore.setItemAsync("friends", JSON.stringify(updated));
      setFriendCode("");
    } catch {
      setError("Couldn't find that code. Try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleGetBlendedRecs = async (friend: Friend) => {
    setSelectedFriend(friend);
    setRecs([]);
    setLoading(true);
    setError(null);

    try {
      const token = await getValidToken();
      if (!token) { setError("Not logged in"); setLoading(false); return; }

      const ranked = await getRankedSongs();
      const topSongs = ranked
        .sort((a, b) => b.eloScore - a.eloScore)
        .slice(0, 10)
        .map(s => ({ name: s.name, artist: s.artist }));

      const friendSongs = friend.topTracks
        .slice(0, 10)
        .map((t: any) => ({ name: t.name, artist: t.artist }));

      const res = await fetch(`${BASE_URL}/api/openai/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topSongs,
          token,
          friendSongs,
          friendName: friend.name,
        }),
      });

      const text = await res.text();
      const data = JSON.parse(text);
      setRecs(data.recommendations ?? []);
    } catch (e: any) {
      setError("Couldn't generate recommendations.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (code: string) => {
    const updated = friends.filter(f => f.code !== code);
    setFriends(updated);
    await SecureStore.setItemAsync("friends", JSON.stringify(updated));
    if (selectedFriend?.code === code) {
      setSelectedFriend(null);
      setRecs([]);
    }
  };

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
            <Text style={styles.headerTitle}>friends</Text>
            <Text style={styles.headerSubtitle}>share taste, discover together</Text>
          </View>
        </View>
      </View>

      {/* My code */}
      <View style={styles.myCodeCard}>
        <Text style={styles.myCodeLabel}>your taste code</Text>
        <Text style={styles.myCode}>{myCode}</Text>
        <Text style={styles.myCodeHint}>share this with friends so they can add you</Text>
      </View>

      {/* Add friend */}
      <View style={styles.addSection}>
        <Text style={styles.sectionLabel}>ADD A FRIEND</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter friend's taste code"
            placeholderTextColor="#ccc"
            value={friendCode}
            onChangeText={setFriendCode}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.addButton, adding && { opacity: 0.5 }]}
            onPress={handleAddFriend}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Friends list */}
      {friends.length > 0 && (
        <View style={styles.friendsSection}>
          <Text style={styles.sectionLabel}>YOUR FRIENDS</Text>
          {friends.map((friend) => (
            <TouchableOpacity
              key={friend.code}
              style={[styles.friendRow, selectedFriend?.code === friend.code && styles.friendRowActive]}
              onPress={() => handleGetBlendedRecs(friend)}
              activeOpacity={0.7}
            >
              <View style={styles.friendAvatar}>
                <Text style={styles.friendAvatarText}>{friend.name[0]}</Text>
              </View>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.friendCode}>code: {friend.code}</Text>
              </View>
              <TouchableOpacity
                onPress={() => Alert.alert("Remove", `Remove ${friend.name}?`, [
                  { text: "Cancel" },
                  { text: "Remove", style: "destructive", onPress: () => handleRemoveFriend(friend.code) }
                ])}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Blended recs */}
      {selectedFriend && (
        <View style={styles.recsSection}>
          <Text style={styles.sectionLabel}>
            YOU + {selectedFriend.name.toUpperCase()} WOULD BOTH LOVE
          </Text>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1db954" />
              <Text style={styles.loadingText}>Blending your tastes...</Text>
            </View>
          )}

          {!loading && recs.map((rec) => (
            <View key={rec.track.id} style={styles.recCard}>
              <Image source={{ uri: rec.track.albumArt }} style={styles.recArt} />
              <View style={styles.recInfo}>
                <Text style={styles.recName} numberOfLines={1}>{rec.track.name}</Text>
                <Text style={styles.recArtist} numberOfLines={1}>{rec.track.artist}</Text>
                <Text style={styles.recWhy} numberOfLines={2}>
                  {rec.explanation ?? "Matches both your tastes."}
                </Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchPct}>{Math.round(rec.score * 100)}%</Text>
                <Text style={styles.matchLabel}>match</Text>
              </View>
            </View>
          ))}

          {!loading && recs.length === 0 && (
            <Text style={styles.emptyText}>No recs found — try again</Text>
          )}
        </View>
      )}

      {friends.length === 0 && (
        <View style={styles.emptyFriends}>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySubtitle}>Share your taste code and ask friends to add you</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: "#fff" },
  content:           { paddingBottom: 60 },
  header:            { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", marginBottom: 8 },
  headerLeft:        { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:            { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#eee" },
  headerTitle:       { fontSize: 22, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.5 },
  headerSubtitle:    { fontSize: 13, color: "#888", marginTop: 1 },
  myCodeCard:        { margin: 20, backgroundColor: "#f9f9f9", borderRadius: 16, padding: 20, alignItems: "center" },
  myCodeLabel:       { fontSize: 12, color: "#aaa", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  myCode:            { fontSize: 32, fontWeight: "800", color: "#1db954", letterSpacing: 4, marginBottom: 8 },
  myCodeHint:        { fontSize: 12, color: "#aaa", textAlign: "center" },
  addSection:        { paddingHorizontal: 20, marginBottom: 24 },
  sectionLabel:      { fontSize: 12, fontWeight: "700", color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  inputRow:          { flexDirection: "row", gap: 10 },
  input:             { flex: 1, backgroundColor: "#f5f5f5", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1a1a1a" },
  addButton:         { backgroundColor: "#1db954", borderRadius: 20, paddingHorizontal: 20, justifyContent: "center" },
  addButtonText:     { color: "#fff", fontWeight: "700", fontSize: 15 },
  errorText:         { color: "#ff4444", fontSize: 13, marginTop: 8 },
  friendsSection:    { paddingHorizontal: 20, marginBottom: 24 },
  friendRow:         { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5", gap: 12 },
  friendRowActive:   { backgroundColor: "#f0faf4", borderRadius: 12, paddingHorizontal: 12 },
  friendAvatar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1db954", alignItems: "center", justifyContent: "center" },
  friendAvatarText:  { color: "#fff", fontWeight: "700", fontSize: 16 },
  friendInfo:        { flex: 1 },
  friendName:        { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  friendCode:        { fontSize: 12, color: "#aaa", marginTop: 2 },
  removeText:        { color: "#ccc", fontSize: 16, padding: 4 },
  recsSection:       { paddingHorizontal: 20 },
  loadingContainer:  { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText:       { color: "#aaa", fontSize: 14 },
  recCard:           { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  recArt:            { width: 52, height: 52, borderRadius: 8 },
  recInfo:           { flex: 1, marginLeft: 12 },
  recName:           { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  recArtist:         { fontSize: 13, color: "#888", marginTop: 2 },
  recWhy:            { fontSize: 12, color: "#bbb", marginTop: 4, lineHeight: 17 },
  matchBadge:        { alignItems: "center", marginLeft: 10 },
  matchPct:          { color: "#1db954", fontSize: 16, fontWeight: "700" },
  matchLabel:        { color: "#aaa", fontSize: 10 },
  emptyFriends:      { alignItems: "center", paddingTop: 60, gap: 8, paddingHorizontal: 40 },
  emptyTitle:        { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  emptySubtitle:     { fontSize: 14, color: "#aaa", textAlign: "center" },
  emptyText:         { color: "#aaa", textAlign: "center", paddingVertical: 20 },
});