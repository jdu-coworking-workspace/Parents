import { useEffect, useState, useContext } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { I18nContext } from '@/contexts/i18n-context';
import { createStudentFirstPassword } from "@/services/student-auth";
import { showSuccessToast } from "@/utils/toast";

export default function SetPasswordScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const isFirstPasswordMode = params.mode === "first-password";
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
  const { t } = useContext(I18nContext);

  useEffect(() => {
    if (!isFirstPasswordMode && !isAuthLoading && isSignedIn) {
      router.replace("/(tabs)/(home)");
    }
  }, [isFirstPasswordMode, isAuthLoading, isSignedIn, router]);

  useEffect(() => {
    if (
      !isAuthLoading &&
      !isSignedIn &&
      (isFirstPasswordMode || !firstLoginChallenge)
    ) {
      router.replace("/sign-in");
    }
  }, [
    firstLoginChallenge,
    isFirstPasswordMode,
    isAuthLoading,
    isSignedIn,
    router,
  ]);

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
    { key: 'minLength', passed: newPassword.length >= 8 },
    { key: 'hasNumber', passed: /\d/.test(newPassword) },
    { key: 'hasUppercase', passed: /[A-Z]/.test(newPassword) },
    { key: 'hasLowercase', passed: /[a-z]/.test(newPassword) },
    {
      key: 'hasSpecialChar',
      passed: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/;'`~]/.test(newPassword),
    },
  ];

  const passwordScore = passwordRules.filter((rule) => rule.passed).length;
  const passwordStrength =
    passwordScore <= 1
      ? { label: t('weak'), color: palette.danger }
      : passwordScore <= 3
        ? { label: t('weak'), color: palette.warning }
        : passwordScore <= 4
          ? { label: t('medium'), color: palette.warning }
          : { label: t('strong'), color: palette.success };

  const passwordBarWidth = (passwordScore / passwordRules.length);

  const handlePasswordSetup = async () => {
    if (!isFirstPasswordMode && !firstLoginChallenge) {
      router.replace("/sign-in");
      return;
    }

    if (!newPassword.trim()) {
      setError(t('enterNewPassword'));
      return;
    }

    if (passwordScore < passwordRules.length) {
      setError(t('passwordRequirementsNotMet'));
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      if (isFirstPasswordMode) {
        await createStudentFirstPassword(newPassword);
        router.replace("/(tabs)/(settings)");
        setTimeout(() => {
          showSuccessToast(t("passwordCreatedSuccessfully"));
        }, 250);
        return;
      }

      await completeFirstLogin(
        firstLoginChallenge!.email,
        firstLoginChallenge!.tempPassword,
        newPassword,
      );

      router.replace("/(tabs)/(home)");
    } catch (e: any) {
      setError(e?.message || t('savePasswordFailed'));
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
                <ThemedText disableScaling style={styles.title}>{t('createNewPasswordTitle')}</ThemedText>
              </View>

              <View style={styles.inputBlock}>
                <ThemedText disableScaling style={styles.label}>{t('enterNewPasswordText')}</ThemedText>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t('enterNewPassword')}
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
                  <ThemedText disableScaling style={styles.validationTitle}>{t('passwordStrength')}</ThemedText>

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
                      disableScaling
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
                        <View key={rule.key} style={styles.ruleRow}>
                          <Ionicons
                            name={rule.passed ? "checkmark-circle" : "close-circle"}
                            size={20}
                            color={iconColor}
                            style={styles.ruleIcon}
                          />
                          <View style={styles.ruleTextWrap}>
                            <ThemedText
                              disableScaling
                              style={[
                                styles.ruleText,
                                {
                                  color: rule.passed
                                    ? Colors[colorScheme].text
                                    : palette.danger,
                                },
                              ]}
                            >
                              {t(rule.key as any)}
                            </ThemedText>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {error ? (
                <ThemedText
                  disableScaling
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
                <ThemedText disableScaling style={styles.primaryButtonText}>{isLoading ? t('loading') : t('saveNewPassword')}</ThemedText>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  if (isFirstPasswordMode) {
                    router.back();
                    return;
                  }

                  clearFirstLoginChallenge();
                  router.replace("/sign-in");
                }}
                disabled={isLoading}
              >
                <ThemedText disableScaling style={{ color: Colors[colorScheme].text }}>{t('back')}</ThemedText>
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
    marginTop: 0,
    marginBottom: 0,
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
