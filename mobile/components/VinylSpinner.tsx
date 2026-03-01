import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export default function VinylSpinner({
  size = 70,
  color = "#1db954",
}) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Circle cx="12" cy="12" r="10" />
        <Path d="M6 12c0-1.7.7-3.2 1.8-4.2" />
        <Circle cx="12" cy="12" r="2" />
        <Path d="M18 12c0 1.7-.7 3.2-1.8 4.2" />
      </Svg>
    </Animated.View>
  );
}