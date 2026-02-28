import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="rankings" options={{ title: "My Rankings" }} />
      <Stack.Screen name="queue" options={{ title: "To Rank" }} />
      <Stack.Screen name="recs" options={{ title: "Recommendations" }} />
    </Stack>
  );
}