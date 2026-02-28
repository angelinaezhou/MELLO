// individual song listing component

import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { QueuedSong } from "../utils/storage";

type Props = {
  song: QueuedSong;
  index?: number;
  onBookmark: (song: QueuedSong) => void;
  onPress: (song: QueuedSong) => void;
  bookmarked?: boolean;
};

export default function SongCard({ song, index, onBookmark, onPress, bookmarked }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(song)} activeOpacity={0.7}>
      {index !== undefined && (
        <Text style={styles.rank}>{index + 1}</Text>
      )}

      <Image source={{ uri: song.albumArt }} style={styles.albumArt} />

      <View style={styles.info}>
        <Text style={styles.songName} numberOfLines={1}>{song.name}</Text>
        <Text style={styles.artistName} numberOfLines={1}>{song.artist}</Text>
      </View>

      <TouchableOpacity
        onPress={() => onBookmark(song)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.bookmarkButton}
      >
        <Ionicons
          name={bookmarked ? "bookmark" : "bookmark-outline"}
          size={20}
          color={bookmarked ? "#1db954" : "#ccc"}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f9f9f9",
    backgroundColor: "#fff",
  },
  rank: {
    fontSize: 14,
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
  info: {
    flex: 1,
  },
  songName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  artistName: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  bookmarkButton: {
    padding: 4,
  },
});