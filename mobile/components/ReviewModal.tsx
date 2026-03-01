// popup that appears for you to review after clicking on a song

import {
    View, Text, Image, TextInput, TouchableOpacity,
    Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
  } from "react-native";
  import { useState, useEffect } from "react";
  import * as SecureStore from "expo-secure-store";
  import type { QueuedSong } from "../utils/storage";
  import { Ionicons } from "@expo/vector-icons"

  
  type Vibe = "loved" | "okay" | "dislike";
  
  type Props = {
    song: QueuedSong | null;
    visible: boolean;
    onClose: () => void;
    onConfirm: (song: QueuedSong, vibe: Vibe, review: string) => void;
  };
  
  const VIBE_OPTIONS = [
    { value: "loved",   label: "i loved it!", icon: "heart",        color: "rgba(134,191,142,0.15)", iconColor: "#86BF8E" },
    { value: "okay",    label: "it was okay.",    icon: "remove-circle", color: "rgba(217,195,106,0.15)", iconColor: "#D9C36A" },
    { value: "dislike", label: "not for me.",     icon: "close-circle",  color: "rgba(208,145,117,0.15)", iconColor: "#D09175" },
  ];
  
  export default function ReviewModal({ song, visible, onClose, onConfirm }: Props) {
    const [vibe, setVibe] = useState<Vibe | null>(null);
    const [review, setReview] = useState("");
    const [genres, setGenres] = useState<string[]>([]);
    const [loadingGenres, setLoadingGenres] = useState(false);
  
    useEffect(() => {
      if (song && visible) {
        setVibe(null);
        setReview("");
        setGenres([]);
        fetchGenres(song.artistId);
      }
    }, [song, visible]);
  
    const fetchGenres = async (artistId: string) => {
      setLoadingGenres(true);
      try {
        const token = await SecureStore.getItemAsync("access_token");
        if (!token) return;
  
        const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setGenres((data.genres ?? []).slice(0, 2));
      } catch {
        setGenres([]);
      } finally {
        setLoadingGenres(false);
      }
    };
  
    const handleConfirm = () => {
      if (!song || !vibe) return;
      onConfirm(song, vibe, review.trim());
    };
  
    if (!song) return null;
  
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
  
            {/* Handle bar */}
            <View style={styles.handle} />
  
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
  
            {/* Song info */}
            <View style={styles.songSection}>
              <Image source={{ uri: song.albumArt }} style={styles.albumArt} />
              <Text style={styles.songName}>{song.name}</Text>
              <Text style={styles.artistName}>{song.artist}</Text>
  
              {/* Genres */}
              <View style={styles.genreRow}>
                {loadingGenres ? (
                  <ActivityIndicator size="small" color="#ccc" />
                ) : genres.length > 0 ? (
                  genres.map((g) => (
                    <View key={g} style={styles.genreTag}>
                      <Text style={styles.genreText}>{g}</Text>
                    </View>
                  ))
                ) : null}
              </View>
            </View>
  
            {/* Vibe selector */}
            <Text style={styles.sectionLabel1}>Thoughts?</Text>
            <View style={styles.vibeRow}>
            {VIBE_OPTIONS.map((opt) => (
                <TouchableOpacity
                    key={opt.value}
                    onPress={() => setVibe(opt.value as Vibe)}
                    style={[
                    styles.vibeOption,
                    vibe === opt.value && { backgroundColor: opt.color, borderColor: opt.iconColor }
                    ]}
                    activeOpacity={0.8}
                >
                    <View style={[styles.vibeIconBox, { backgroundColor: opt.color }]}>
                    <Ionicons name={opt.icon as any} size={18} color={opt.iconColor} />
                    </View>
                    <Text style={[styles.vibeLabel, vibe === opt.value && { color: opt.iconColor, fontWeight: "700" }]}>
                    {opt.label}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>
  
            {/* Review text */}
            <Text style={styles.sectionLabel2}>Tell us more! This can affect your song score too.</Text>
            <TextInput
              style={styles.textInput}
              placeholder="..."
              placeholderTextColor="#ccc"
              value={review}
              onChangeText={setReview}
              multiline
              maxLength={100}
            />
            <Text style={styles.charCount}>{review.length} / 100</Text>
  
            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.confirmButton, !vibe && styles.confirmDisabled]}
              onPress={handleConfirm}
              disabled={!vibe}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>Add to rankings →</Text>
            </TouchableOpacity>
  
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#fff",
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: "#e5e5e5",
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    closeButton: {
      alignSelf: "flex-end",
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    closeText: {
      fontSize: 18,
      color: "#ccc",
    },
    songSection: {
      alignItems: "center",
      paddingHorizontal: 32,
      gap: 6,
    },
    albumArt: {
      width: 120,
      height: 120,
      borderRadius: 12,
      marginBottom: 8,
    },
    songName: {
      fontSize: 20,
      fontWeight: "700",
      color: "#1a1a1a",
      textAlign: "center",
      letterSpacing: -0.5,
      fontFamily: "Anton"
    },
    artistName: {
      fontSize: 14,
      color: "#676767",
      textAlign: "center",
      fontFamily: "Anton"
    },
    genreRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
      minHeight: 28,
      alignItems: "center",
    },
    genreTag: {
      backgroundColor: "#f5f5f5",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
    },
    genreText: {
      fontSize: 12,
      color: "#888",
      textTransform: "capitalize",
    },
    sectionLabel1: {
      fontSize: 14,
      fontWeight: "600",
      color: "#676767",
      paddingHorizontal: 20,
      marginTop: -24,
      marginBottom: 12,
    },
    sectionLabel2: {
        fontSize: 14,
        fontWeight: "600",
        color: "#676767",
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 12,
      },
    vibeRow: {
      flexDirection: "row",
      paddingHorizontal: 15,
      gap: 10,
    },
    vibeButtonSelected: {
      borderColor: "#1a1a1a22",
    },
    vibeLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: "#aaa",
      textAlign: "center",
      flex: 1,
      width: 50
    },
    textInput: {
      marginHorizontal: 20,
      backgroundColor: "#f9f9f9",
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: "#1a1a1a",
      minHeight: 100,
      textAlignVertical: "top",
    },
    charCount: {
      textAlign: "right",
      paddingHorizontal: 20,
      marginTop: 6,
      fontSize: 12,
      color: "#ccc",
    },
    confirmButton: {
      marginHorizontal: 20,
      marginTop: 28,
      backgroundColor: "#1db954",
      paddingVertical: 16,
      borderRadius: 30,
      alignItems: "center",
    },
    confirmDisabled: {
      backgroundColor: "#e5e5e5",
    },
    confirmText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
    vibeOption: {
        flexDirection: "column",
        alignItems: "center",
        alignSelf: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 2,
        marginRight: 8,
        borderColor: "transparent",
        backgroundColor: "#f9f9f9",
      },
      vibeIconBox: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
      },
  });