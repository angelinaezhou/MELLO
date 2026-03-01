import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { UserProvider } from "../context/userContext";
import { useFonts, FjallaOne_400Regular } from "@expo-google-fonts/fjalla-one";
import { Anton_400Regular } from "@expo-google-fonts/anton"
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

export default function Layout() {
  const [fontsLoaded] = useFonts({
    FjallaOne_400Regular,
    Anton_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <UserProvider>
      <Tabs screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: "#1db954", 
        tabBarStyle: {
          backgroundColor: "#fff",
          paddingTop: 8, 
          paddingBottom: 12,
          height: 90, 
          shadowOpacity: 0.1,
          shadowRadius: 16,
        }
      }}>
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
        <Tabs.Screen name="rankings" options={{ title: "My Rankings", tabBarIcon: ({ color, size }) => <Ionicons name="star" size={size} color={color} /> }} />
        <Tabs.Screen name="add" options={{ title: "Add", tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes" size={size} color={color} /> }} />
        <Tabs.Screen name="recs" options={{ title: "Recs", tabBarIcon: ({ color, size }) => <Ionicons name="options" size={size} color={color} /> }} />
      </Tabs>
    </UserProvider>
  );
}