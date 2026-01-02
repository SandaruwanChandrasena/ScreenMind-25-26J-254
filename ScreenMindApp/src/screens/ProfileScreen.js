import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Image,
  TouchableOpacity,
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
  ActivityIndicator,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";

import { AuthContext } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import TextField from "../components/TextField";
import PrimaryButton from "../components/PrimaryButton";

export default function ProfileScreen() {
  const { user, signOut, updateName, updateProfilePhoto } = useContext(AuthContext);

  const [name, setName] = useState(user?.displayName || "");

  // ✅ Local selected image (preview only until Save)
  const [pendingPhotoUri, setPendingPhotoUri] = useState(null);

  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // keep input synced when user changes
  useEffect(() => {
    setName(user?.displayName || "");
  }, [user?.displayName]);

  const email = user?.email || "—";

  const initials = useMemo(() => {
    return (user?.displayName || user?.email || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }, [user?.displayName, user?.email]);

  // ✅ Show preview if user selected a new image
  const avatarSource = useMemo(() => {
    if (pendingPhotoUri) return { uri: pendingPhotoUri };
    if (user?.photoURL) return { uri: user.photoURL };
    return null;
  }, [pendingPhotoUri, user?.photoURL]);

  const busy = saving || loggingOut;

  const onPickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.85,
        selectionLimit: 1,
      });

      if (result.didCancel) return;

      const uri = result?.assets?.[0]?.uri;
      if (!uri) throw new Error("No image selected.");

      // ✅ only preview, don't upload yet
      setPendingPhotoUri(uri);
    } catch (e) {
      Alert.alert("Image failed", e?.message ?? "Something went wrong");
    }
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }

    try {
      setSaving(true);

      // ✅ 1) Update name if changed
      if ((user?.displayName || "") !== name.trim()) {
        await updateName(name.trim());
      }

      // ✅ 2) Upload photo ONLY if user picked a new one
      if (pendingPhotoUri) {
        await updateProfilePhoto(pendingPhotoUri);
        setPendingPhotoUri(null); // clear preview after upload
      }

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
      setLoggingOut(true);
      await signOut();
    } catch (e) {
      Alert.alert("Logout failed", e?.message ?? "Something went wrong");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={styles.overlayText}>{saving ? "Saving..." : "Logging out..."}</Text>
        </View>
      )}

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
                <TouchableOpacity
                  onPress={onPickImage}
                  activeOpacity={0.85}
                  style={styles.avatarBtn}
                  disabled={busy}
                >
                  {avatarSource ? (
                    <Image source={avatarSource} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                  )}

                  <Text style={styles.changePhotoText}>
                    {pendingPhotoUri ? "Selected (tap Save)" : "Change photo"}
                  </Text>
                </TouchableOpacity>

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
                disabled={busy}
              />

              <View style={{ height: spacing.md }} />

              <PrimaryButton
                title={loggingOut ? "Logging out..." : "Log Out"}
                onPress={onLogout}
                style={styles.logoutBtn}
                disabled={busy}
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
  avatarBtn: { alignItems: "center" },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(124,58,237,0.25)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text, fontWeight: "900", fontSize: 20 },

  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },

  changePhotoText: {
    color: colors.primary2,
    fontWeight: "800",
    marginTop: 10,
    fontSize: 12,
  },

  nameText: { color: colors.text, fontSize: 16, fontWeight: "900" },
  emailText: { color: colors.muted, marginTop: 4 },

  logoutBtn: { backgroundColor: "rgba(239,68,68,0.85)" },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  overlayText: { color: colors.text, fontWeight: "800", marginTop: 12 },

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
