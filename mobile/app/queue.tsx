import { View, Text } from "react-native";

export default function Queue() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18 }}>Songs bookmarked to listen later</Text>
    </View>
  );
}