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
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SetPasswordScreen() {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    cardBg: colorScheme === "dark" ? "#101417" : "#FFFFFF",
    cardBorder: colorScheme === "dark" ? "#26323A" : "#E5E7EB",
    primary: "#2563EB",
    muted: colorScheme === "dark" ? "#9CA3AF" : "#6B7280",
    mutedSoft: colorScheme === "dark" ? "#6B7280" : "#9CA3AF",
    error: "#DC2626",
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626",
  };

  const passwordRules = [
    {
      label: "Kamida 8 ta belgi",
      passed: newPassword.length >= 8,
    },
    {
      label: "Kamida 1 ta raqam",
      passed: /\d/.test(newPassword),
    },
    {
      label: "Kamida 1 ta katta harf",
      passed: /[A-Z]/.test(newPassword),
    },
    {
      label: "Kamida 1 ta kichik harf",
      passed: /[a-z]/.test(newPassword),
    },
    {
      label: "Kamida 1 ta maxsus belgi",
      passed: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/;'`~]/.test(newPassword),
      examples: '(!@#%&/\\,><\'|;_~`+=^$.()[]{}?")',
    },
  ];

  const passwordScore = passwordRules.filter((rule) => rule.passed).length;
  const passwordStrength =
    passwordScore <= 1
      ? { label: "Juda zaif", color: palette.danger }
      : passwordScore <= 3
        ? { label: "Zaif", color: palette.warning }
        : passwordScore <= 4
          ? { label: "O'rtacha", color: palette.warning }
          : { label: "Kuchli", color: palette.success };

  const passwordBarWidth = (passwordScore / passwordRules.length);

  const handlePasswordSetup = async () => {
    if (!firstLoginChallenge) {
      router.replace("/sign-in");
      return;
    }

    if (!newPassword.trim()) {
      setError("O'zingizning passwordingizni kiriting");
      return;
    }

    if (passwordScore < passwordRules.length) {
      setError("Password kuch talablari to'liq bajarilmadi");
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
                  {"Yangi password yaratish"}
                </ThemedText>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Yangi password kiriting"
                    placeholderTextColor={palette.muted}
                    style={[
                      styles.input,
                      {
                        color: Colors[colorScheme].text,
                        backgroundColor: palette.inputBg,
                        borderColor: palette.inputBorder,
                      },
                    ]}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <Pressable
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color={palette.muted}
                    />
                  </Pressable>
                </View>
              </View>

              {newPassword.length > 0 ? (
                <View
                  style={[
                    styles.validationCard,
                    {
                      backgroundColor: palette.cardBg,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <ThemedText style={styles.validationTitle}>
                    Parol kuchi
                  </ThemedText>

                  <View style={styles.strengthRow}>
                    <View style={styles.strengthBarTrack}>
                      <View
                        style={[
                          styles.strengthBarFill,
                          {
                            flex: passwordBarWidth,
                            backgroundColor: passwordStrength.color,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText
                      style={[
                        styles.strengthLabel,
                        { color: passwordStrength.color },
                      ]}
                    >
                      {passwordStrength.label}
                    </ThemedText>
                  </View>

                  <View style={styles.rulesList}>
                    {passwordRules.map((rule) => {
                      const iconColor = rule.passed
                        ? palette.success
                        : palette.danger;
                      return (
                        <View key={rule.label} style={styles.ruleRow}>
                          <Ionicons
                            name={rule.passed ? "checkmark-circle" : "close-circle"}
                            size={20}
                            color={iconColor}
                            style={styles.ruleIcon}
                          />
                          <View style={styles.ruleTextWrap}>
                            <ThemedText
                              style={[
                                styles.ruleText,
                                {
                                  color: rule.passed
                                    ? Colors[colorScheme].text
                                    : palette.danger,
                                },
                              ]}
                            >
                              {rule.label}
                            </ThemedText>
                            {rule.examples ? (
                              <ThemedText
                                style={[
                                  styles.ruleHint,
                                  { color: palette.mutedSoft },
                                ]}
                              >
                                {rule.examples}
                              </ThemedText>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    padding: 12,
  },
  validationCard: {
    marginTop: 4,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  validationTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  strengthRow: {
    marginBottom: 14,
  },
  strengthBarTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    flexDirection: "row",
  },
  strengthBarFill: {
    height: "100%",
    borderRadius: 999,
    flex: 0,
  },
  strengthLabel: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
  },
  rulesList: {
    gap: 10,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  ruleIcon: {
    marginTop: 1,
    marginRight: 10,
  },
  ruleTextWrap: {
    flex: 1,
  },
  ruleText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  ruleHint: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
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
    flex: 1,
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
