import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors } from "../../../theme/colors";

/**
 * GaugeRing Component
 * Displays a beautiful donut/gauge ring visualization for risk scores (0-100)
 * 
 * Features:
 * - Animated stroke based on risk percentage
 * - Color gradient (green → yellow → red → dark red)
 * - Center text showing score and label
 * - Responsive sizing
 */
export default function GaugeRing({ score = 0, label = "Low", size = 180 }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.min(Math.max(score, 0), 100),
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [score]);

  // Determine color based on score
  const getColor = (val) => {
    if (val < 25) return { start: "#10b981", end: "#34d399", name: "green" }; // Green
    if (val < 50) return { start: "#f59e0b", end: "#fbbf24", name: "yellow" }; // Yellow
    if (val < 75) return { start: "#f87171", end: "#fca5a5", name: "lightred" }; // Light Red
    return { start: "#dc2626", end: "#991b1b", name: "darkred" }; // Dark Red
  };

  const colorScheme = getColor(score);

  // SVG ring parameters
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;

  const centerX = size / 2;
  const centerY = size / 2;

  // Get stroke dashoffset value from animated value
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.svgWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Gradient Definitions */}
          <Defs>
            <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colorScheme.start} stopOpacity="1" />
              <Stop offset="100%" stopColor={colorScheme.end} stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Background circle (unfilled part) */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
          />

          {/* Animated filled circle with color gradient */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke="url(#gaugeGradient)"
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </Svg>
      </View>

      {/* Center Text */}
      <View style={styles.centerText}>
        <Text style={styles.scoreText}>{Math.round(score)}</Text>
        <Text style={styles.labelText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  svgWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  centerText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 52,
    fontWeight: "900",
    color: colors.text,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.muted,
    marginTop: 4,
  },
});
