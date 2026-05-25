import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BrandColors,
  Colors,
  colors as semanticColors,
} from "@/constants/theme";
import { I18nContext } from "@/contexts/i18n-context";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { setStudentPassword } from "@/services/student-auth";
import { ApiError } from "@/services/api-client";
import { showSuccessToast } from "@/utils/toast";
import type { TranslationKeys } from "@/types/i18n";

function usePasswordPalette(colorScheme: "light" | "dark") {
  return {
    text: Colors[colorScheme].text,
    primary: BrandColors[colorScheme],
    inputBg: colorScheme === "dark" ? "#151718" : "#FFFFFF",
    inputBorder: colorScheme === "dark" ? "#FFFFFF" : "#D1D5DB",
    cardBg: colorScheme === "dark" ? "#101417" : "#FFFFFF",
    cardBorder: colorScheme === "dark" ? "#26323A" : "#E5E7EB",
    muted: colorScheme === "dark" ? "#FFFFFF" : "#6B7280",
    successBg: colorScheme === "dark" ? "#052E24" : "#ECFDF5",
    errorBg: colorScheme === "dark" ? "#3B1010" : "#FEF2F2",
    successBorder: colorScheme === "dark" ? "#065F46" : "#BBF7D0",
    errorBorder: colorScheme === "dark" ? "#7F1D1D" : "#FECACA",
  };
}

function getPasswordRules(password: string) {
  return [
    { key: "minLength" as const, passed: password.length >= 8 },
    { key: "hasNumber" as const, passed: /\d/.test(password) },
    { key: "hasUppercase" as const, passed: /[A-Z]/.test(password) },
    { key: "hasLowercase" as const, passed: /[a-z]/.test(password) },
    {
      key: "hasSpecialChar" as const,
      passed: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/;'`~]/.test(password),
    },
  ];
}

function PasswordField({
  label,
  placeholder,
  value,
  isVisible,
  error,
  palette,
  onChangeText,
  onToggleVisibility,
}: {
  label: string;
  placeholder: string;
  value: string;
  isVisible: boolean;
  error?: string;
  palette: ReturnType<typeof usePasswordPalette>;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.passwordContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={palette.muted}
          style={styles.leftIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          secureTextEntry={!isVisible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          style={[
            styles.input,
            {
              color: palette.text,
              backgroundColor: palette.inputBg,
              borderColor: error ? semanticColors.error : palette.inputBorder,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isVisible ? "Hide password" : "Show password"}
          hitSlop={8}
          onPress={onToggleVisibility}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={isVisible ? "eye-off" : "eye"}
            size={20}
            color={palette.muted}
          />
        </Pressable>
      </View>
      {error ? (
        <View style={styles.fieldErrorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={semanticColors.error}
          />
          <ThemedText style={styles.fieldErrorText}>{error}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function PasswordValidationCard({
  palette,
  password,
  t,
}: {
  palette: ReturnType<typeof usePasswordPalette>;
  password: string;
  t: (key: keyof TranslationKeys) => string;
}) {
  const passwordRules = getPasswordRules(password);
  const passwordScore = passwordRules.filter((rule) => rule.passed).length;
  const passwordStrength =
    passwordScore <= 1
      ? { label: t("weak"), color: semanticColors.error }
      : passwordScore <= 3
        ? { label: t("weak"), color: "#D97706" }
        : passwordScore <= 4
          ? { label: t("medium"), color: "#D97706" }
          : { label: t("strong"), color: semanticColors.success };
  const passwordBarWidth = passwordScore / passwordRules.length;

  return (
    <View
      style={[
        styles.validationCard,
        { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
      ]}
    >
      <ThemedText style={styles.validationTitle}>
        {t("passwordStrength")}
      </ThemedText>
      <View style={styles.strengthRow}>
        <View style={styles.strengthBarTrack}>
          <View
            style={[
              styles.strengthBarFill,
              {
                width: `${passwordBarWidth * 100}%`,
                backgroundColor: passwordStrength.color,
              },
            ]}
          />
        </View>
        <ThemedText
          style={[styles.strengthLabel, { color: passwordStrength.color }]}
        >
          {passwordStrength.label}
        </ThemedText>
      </View>

      <View style={styles.rulesList}>
        {passwordRules.map((rule) => {
          const iconColor = rule.passed
            ? semanticColors.success
            : semanticColors.error;

          return (
            <View key={rule.key} style={styles.ruleRow}>
              <Ionicons
                name={rule.passed ? "checkmark-circle" : "close-circle"}
                size={20}
                color={iconColor}
                style={styles.ruleIcon}
              />
              <ThemedText
                style={[
                  styles.ruleText,
                  {
                    color: rule.passed
                      ? semanticColors.success
                      : semanticColors.error,
                  },
                ]}
              >
                {t(rule.key)}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function SetPasswordScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const palette = usePasswordPalette(colorScheme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useContext(I18nContext);
  const { passwordState, refreshProfile } = useAuth();
  const [passwords, setPasswords] = useState({
    new: "",
    confirm: "",
  });
  const [visibleFields, setVisibleFields] = useState({
    new: false,
    confirm: false,
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"new" | "confirm", string>>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (passwordState?.has_password) {
      router.replace("/(tabs)/(settings)/change-password");
    }
  }, [passwordState, router]);

  const handlePasswordChange = (key: "new" | "confirm", value: string) => {
    setPasswords((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];

      if (
        key === "confirm" &&
        value.length > 0 &&
        passwords.new.length > 0 &&
        passwords.new !== value
      ) {
        next.confirm = t("passwordsDoNotMatch");
      }

      if (key === "new") {
        delete next.confirm;
      }

      return next;
    });
  };

  const handleToggleVisibility = (key: "new" | "confirm") => {
    setVisibleFields((current) => ({ ...current, [key]: !current[key] }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<"new" | "confirm", string>> = {};
    const newPasswordRules = getPasswordRules(passwords.new);

    if (!passwords.new.trim()) {
      nextErrors.new = t("enterNewPassword");
    } else if (newPasswordRules.some((rule) => !rule.passed)) {
      nextErrors.new = t("passwordRequirementsNotMet");
    }

    if (!passwords.confirm.trim()) {
      nextErrors.confirm = t("enterConfirmPassword");
    } else if (passwords.new !== passwords.confirm) {
      nextErrors.confirm = t("passwordsDoNotMatch");
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSavePress = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setFieldErrors({});

      await setStudentPassword(passwords.new, passwords.confirm);
      await refreshProfile();
      setPasswords({ new: "", confirm: "" });
      router.back();
      setTimeout(() => {
        showSuccessToast(t("passwordCreatedSuccessfully"));
      }, 250);
    } catch (error: any) {
      if (error instanceof ApiError && error.status === 400) {
        if (error.message === "passwordsDoNotMatch") {
          setFieldErrors({ confirm: t("passwordsDoNotMatch") });
          return;
        }

        setFieldErrors({ new: t("passwordRequirementsNotMet") });
        return;
      }

      setFieldErrors({ new: error?.message || t("savePasswordFailed") });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        style={styles.screen}
      >
        <ScrollView
          alwaysBounceVertical
          bounces
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(24, insets.bottom + 16) },
          ]}
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          onScrollBeginDrag={Keyboard.dismiss}
          overScrollMode="always"
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View style={styles.headerBlock}>
            <ThemedText style={styles.title}>Set Password</ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              Create a permanent password for your account.
            </ThemedText>
          </View>

          <View style={styles.formSection}>
            <PasswordField
              label={t("newPassword")}
              placeholder={t("enterNewPassword")}
              value={passwords.new}
              isVisible={visibleFields.new}
              error={fieldErrors.new}
              palette={palette}
              onChangeText={(value) => handlePasswordChange("new", value)}
              onToggleVisibility={() => handleToggleVisibility("new")}
            />

            {passwords.new.length > 0 ? (
              <PasswordValidationCard
                palette={palette}
                password={passwords.new}
                t={t}
              />
            ) : null}

            <PasswordField
              label={t("confirmPassword")}
              placeholder={t("enterConfirmPassword")}
              value={passwords.confirm}
              isVisible={visibleFields.confirm}
              error={fieldErrors.confirm}
              palette={palette}
              onChangeText={(value) => handlePasswordChange("confirm", value)}
              onToggleVisibility={() => handleToggleVisibility("confirm")}
            />
          </View>

          <Pressable
            disabled={isSaving}
            onPress={handleSavePress}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: palette.primary },
              isSaving && styles.primaryButtonDisabled,
              pressed && !isSaving && styles.primaryButtonPressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
                style={styles.buttonLoader}
              />
            ) : null}
            <ThemedText style={styles.primaryButtonText}>
              {isSaving ? t("loading") : t("savePassword")}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerBlock: {
    marginTop: 28,
    marginBottom: 32,
  },
  title: {
    fontWeight: "600",
    fontSize: 36,
    lineHeight: 44,
    includeFontPadding: false,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  formSection: {
    gap: 16,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  leftIcon: {
    position: "absolute",
    left: 14,
    zIndex: 1,
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    padding: 12,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 44,
    fontSize: 16,
    flex: 1,
  },
  fieldErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fieldErrorText: {
    color: semanticColors.error,
    fontSize: 13,
  },
  validationCard: {
    marginTop: 4,
    marginBottom: 4,
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
  ruleText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 24,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  buttonLoader: {
    marginRight: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
