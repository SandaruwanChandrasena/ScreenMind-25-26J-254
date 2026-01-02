import React, { useContext, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";

import { AuthContext } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import TextField from "../components/TextField";
import PrimaryButton from "../components/PrimaryButton";

export default function ProfileScreen() {
  const { user, signOut, updateName } = useContext(AuthContext);

  const [name, setName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);

  const email = user?.email || "—";

  const initials = (user?.displayName || user?.email || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }

    try {
      setSaving(true);
      await updateName(name.trim());
      Keyboard.dismiss();
      Alert.alert("Saved", "Your profile was updated.");
    } catch (e) {
      Alert.alert("Update failed", e?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      Alert.alert("Logout failed", e?.message ?? "Something went wrong");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Background glows (same style as auth pages) */}
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.brand}>PROFILE</Text>
            <Text style={styles.title}>Your Account</Text>
            <Text style={styles.subtitle}>Manage your basic profile details.</Text>

            <View style={styles.card}>
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.nameText}>{user?.displayName || "User"}</Text>
                  <Text style={styles.emailText}>{email}</Text>
                </View>
              </View>

              <View style={{ height: spacing.lg }} />

              <TextField
                label="Full Name"
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={onSave}
                blurOnSubmit={true}
              />

              <View style={{ height: spacing.lg }} />

              <PrimaryButton
                title={saving ? "Saving..." : "Save Changes"}
                onPress={onSave}
                disabled={saving}
              />

              <View style={{ height: spacing.md }} />

              <PrimaryButton
                title="Log Out"
                onPress={onLogout}
                style={styles.logoutBtn}
              />
            </View>

            <View style={{ height: spacing.xxl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  brand: { color: colors.muted, fontWeight: "900", letterSpacing: 2 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", marginTop: 8 },
  subtitle: { color: colors.muted, marginTop: 8, marginBottom: spacing.lg, lineHeight: 20 },

  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },

  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(124,58,237,0.25)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text, fontWeight: "900", fontSize: 18 },

  nameText: { color: colors.text, fontSize: 16, fontWeight: "900" },
  emailText: { color: colors.muted, marginTop: 4 },

  logoutBtn: {
    backgroundColor: "rgba(239,68,68,0.85)",
  },

  bgGlow1: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: "#7C3AED",
    opacity: 0.18,
    top: -140,
    left: -140,
  },
  bgGlow2: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    opacity: 0.12,
    bottom: -160,
    right: -140,
  },
});
