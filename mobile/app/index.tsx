import { View, Text, Button } from "react-native";
import { Link } from "expo-router";

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>Melo</Text>

      <Link href="/rankings" asChild>
        <Button title="My Rankings" />
      </Link>

      <Link href="/queue" asChild>
        <Button title="Songs to Rank" />
      </Link>

      <Link href="/recs" asChild>
        <Button title="Recommendations" />
      </Link>
    </View>
  );
}