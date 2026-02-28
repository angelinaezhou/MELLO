import { View, Text, Image, StyleSheet, Animated, FlatList, ActivityIndicator } from "react-native";
import { useUser } from "./userContext";
import * as SecureStore from "expo-secure-store";
import { useState, useEffect } from "react";

type Track = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
};

export default function Queue() {
  const { userName, userImage } = useUser();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    fetchTopTracks();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const fetchTopTracks = async () => {
    const token = await SecureStore.getItemAsync("access_token");
    if (!token) return;

    const res = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTracks(data.items ?? []);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {userImage ? (
            <Image source={{ uri: userImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View>
            <Text style={styles.headerTitle}>saved for later</Text>
            <Text style={styles.headerSubtitle}>your bookmarked tracks</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#1db954" />
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={tracks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item, index }) => (
              <View style={styles.trackRow}>
                <Text style={styles.rank}>{index + 1}</Text>
                <Image
                  source={{ uri: item.album.images[0]?.url }}
                  style={styles.albumArt}
                />
                <View style={styles.trackInfo}>
                  <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.artistName} numberOfLines={1}>
                    {item.artists.map((a) => a.name).join(", ")}
                  </Text>
                </View>
              </View>
            )}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
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
    width: 44,
    height: 44,
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f9f9f9",
  },
  rank: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ccc",
    width: 24,
    textAlign: "right",
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  artistName: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
});