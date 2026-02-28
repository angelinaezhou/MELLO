import { View, Text, TouchableOpacity, StyleSheet, Animated, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import { useState, useEffect } from "react";
import { useUser } from "./userContext";

const BASE_URL = "https://mello-auth.vercel.app";
const APP_URL = "exp://10.4.151.47:8081";


export default function Home() {
  const { userName, userImage, connected, setConnected, logout } = useUser();
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (userName) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [userName]);

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

  if (connected) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {userImage ? (
              <Image source={{ uri: userImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            <View>
              <Text style={styles.headerTitle}>mello</Text>
              <Animated.Text style={[styles.headerSubtitle, { opacity: fadeAnim }]}>
                listening as {userName ?? "..."}
              </Animated.Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={{ color: "#aaa" }}>your music, ranked.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.hero}>
      <Text style={styles.title}>mello</Text>
      <Text style={styles.subtitle}>rank and share your music taste</Text>
      <TouchableOpacity style={styles.spotifyButton} onPress={handleLogin}>
        <FontAwesome name="spotify" size={20} color="#fff" />
        <Text style={styles.spotifyButtonText}>Connect Spotify</Text>
      </TouchableOpacity>
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
  logoutText: {
    color: "#aaa",
    fontSize: 13,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 16,
    paddingHorizontal: 32,
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
    marginTop: 8,
  },
  spotifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});