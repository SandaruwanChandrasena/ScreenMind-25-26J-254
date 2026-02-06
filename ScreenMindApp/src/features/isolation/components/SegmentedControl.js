import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function SegmentedControl({ value, options, onChange }) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [
              styles.btn,
              active && styles.btnActive,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    marginTop: spacing.lg,
    padding: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: "rgba(124,58,237,0.28)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.50)",
  },
  text: { color: colors.muted, fontWeight: "900", fontSize: 12 },
  textActive: { color: colors.text },
});
