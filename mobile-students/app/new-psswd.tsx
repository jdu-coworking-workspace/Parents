import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SetPasswordScreen() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    completeFirstLogin,
    firstLoginChallenge,
    clearFirstLoginChallenge,
    isSignedIn,
    isLoading: isAuthLoading,
  } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";

  useEffect(() => {
    if (!isAuthLoading && isSignedIn) {
      router.replace("/(tabs)/(home)");
    }
  }, [isAuthLoading, isSignedIn, router]);

  useEffect(() => {
    if (!isAuthLoading && !isSignedIn && !firstLoginChallenge) {
      router.replace("/sign-in");
    }
  }, [firstLoginChallenge, isAuthLoading, isSignedIn, router]);

  const palette = {
    inputBg: colorScheme === "dark" ? "#151718" : "#f8f9fa",
    inputBorder: colorScheme === "dark" ? "#374151" : "#D1D5DB",
    primary: "#2563EB",
    muted: colorScheme === "dark" ? "#9CA3AF" : "#6B7280",
    error: "#DC2626",
  };

  const handlePasswordSetup = async () => {
    if (!firstLoginChallenge) {
      router.replace("/sign-in");
      return;
    }

    if (!newPassword.trim()) {
      setError("O'zingizning passwordingizni kiriting");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwordlar mos kelmadi");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      await completeFirstLogin(
        firstLoginChallenge.email,
        firstLoginChallenge.tempPassword,
        newPassword,
      );

      router.replace("/(tabs)/(home)");
    } catch (e: any) {
      setError(e?.message || "Password saqlashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.safeArea}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerBlock}>
                <ThemedText style={styles.title}>
                  Create{"\n"}Password
                </ThemedText>
              </View>

              <View style={styles.inputBlock}>
                <ThemedText style={styles.label}>
                  {"O'zingizning passwordingiz"}
                </ThemedText>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Yangi password kiriting"
                  placeholderTextColor={palette.muted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.inputBg,
                      borderColor: palette.inputBorder,
                    },
                  ]}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputBlock}>
                <ThemedText style={styles.label}>
                  {"Password tasdig'i"}
                </ThemedText>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Passwordni qayta kiriting"
                  placeholderTextColor={palette.muted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.inputBg,
                      borderColor: palette.inputBorder,
                    },
                  ]}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              {error ? (
                <ThemedText
                  style={[styles.feedbackText, { color: palette.error }]}
                >
                  {error}
                </ThemedText>
              ) : null}

              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: palette.primary },
                ]}
                onPress={handlePasswordSetup}
                disabled={isLoading}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {isLoading ? "Loading..." : "Save"}
                </ThemedText>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  clearFirstLoginChallenge();
                  router.replace("/sign-in");
                }}
                disabled={isLoading}
              >
                <ThemedText style={{ color: Colors[colorScheme].text }}>
                  Back
                </ThemedText>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  headerBlock: {
    marginTop: 28,
    marginBottom: 60,
  },
  title: {
    fontWeight: "600",
    fontSize: 40,
    lineHeight: 48,
    includeFontPadding: false,
  },
  inputBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackText: {
    marginTop: 8,
    fontSize: 13,
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: "center",
  },
});
