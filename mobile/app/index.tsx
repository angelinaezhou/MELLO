import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import { useState } from "react";
import { useSpotifyAuth } from "../hooks/useSpotifyAuth";
import { FontAwesome } from "@expo/vector-icons";

const BASE_URL = "https://mello-auth.vercel.app";
const APP_URL = "exp://10.4.151.47:8081";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const { getValidToken } = useSpotifyAuth(); 

  const handleLogin = async () => {
    const result = await WebBrowser.openAuthSessionAsync(
      `${BASE_URL}/api/auth/spotify/start`,
      APP_URL
    );

    if (result.type === "success") {
      const { queryParams } = Linking.parse(result.url);
      if (queryParams?.auth === "success") {
        await SecureStore.setItemAsync("access_token", queryParams.access_token as string);
        await SecureStore.setItemAsync("refresh_token", queryParams.refresh_token as string ?? "");
        await SecureStore.setItemAsync("expires_in", queryParams.expires_in as string);
        await SecureStore.setItemAsync("stored_at", String(Date.now()));
        setConnected(true);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>mello</Text>
        <Text style={styles.subtitle}>rank and share your music taste</Text>
      </View>

      {connected ? (
        <View style={styles.connectedBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#1db954" />
          <Text style={styles.connectedText}>Spotify connected</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.spotifyButton} onPress={handleLogin}>
          <FontAwesome name="spotify" size={20} color="#fff" />
          <Text style={styles.spotifyButtonText}>Connect Spotify</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 24,
    paddingHorizontal: 32,
  },
  hero: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 48,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: "#aaa",
  },
  spotifyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1db954",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    gap: 10,
  },
  spotifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  connectedText: {
    color: "#1db954",
    fontWeight: "600",
    fontSize: 15,
  },
});