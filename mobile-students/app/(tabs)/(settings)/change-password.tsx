import React, { useContext, useState } from "react";
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
import { Colors, colors as semanticColors } from "@/constants/theme";
import { I18nContext } from "@/contexts/i18n-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { changeStudentPassword } from "@/services/student-auth";
import { ApiError } from "@/services/api-client";
import { showSuccessToast } from "@/utils/toast";
import type { TranslationKeys } from "@/types/i18n";

type PasswordFieldKey = "current" | "new" | "confirm";
type FeedbackTone = "success" | "error";
type PasswordRuleKey =
  | "minLength"
  | "hasNumber"
  | "hasUppercase"
  | "hasLowercase"
  | "hasSpecialChar";

type PasswordFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  isVisible: boolean;
  error?: string;
  palette: ReturnType<typeof usePasswordPalette>;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
};

type SaveButtonProps = {
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  loadingLabel: string;
  palette: ReturnType<typeof usePasswordPalette>;
  onPress: () => void;
};

function usePasswordPalette(colorScheme: "light" | "dark") {
  return {
    text: Colors[colorScheme].text,
    // Input ichidagi yozuv ochroq bo'lishi uchun yangi rang:
    inputText: colorScheme === "dark" ? "#E5E7EB" : "#374151",
    background: Colors[colorScheme].background,
    // Lead bergan ranglar qoshildi:
    primary: "#2563EB",
    inputBg: colorScheme === "dark" ? "#151718" : "#f8f9fa",
    muted: colorScheme === "dark" ? "#9CA3AF" : "#6B7280",
    // Border o'zgartirilmadi, so'raganingizdek eski holatida:
    inputBorder: colorScheme === "dark" ? "#FFFFFF" : "#D1D5DB",

    cardBg: colorScheme === "dark" ? "#101417" : "#FFFFFF",
    cardBorder: colorScheme === "dark" ? "#26323A" : "#E5E7EB",
    mutedSoft: colorScheme === "dark" ? "#E5E7EB" : "#9CA3AF",
    successBg: colorScheme === "dark" ? "#052E24" : "#ECFDF5",
    errorBg: colorScheme === "dark" ? "#3B1010" : "#FEF2F2",
    successBorder: colorScheme === "dark" ? "#065F46" : "#BBF7D0",
    errorBorder: colorScheme === "dark" ? "#7F1D1D" : "#FECACA",
  };
}

function getPasswordRules(
  password: string,
): { key: PasswordRuleKey; passed: boolean }[] {
  return [
    { key: "minLength", passed: password.length >= 8 },
    { key: "hasNumber", passed: /\d/.test(password) },
    { key: "hasUppercase", passed: /[A-Z]/.test(password) },
    { key: "hasLowercase", passed: /[a-z]/.test(password) },
    {
      key: "hasSpecialChar",
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
}: PasswordFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <ThemedText disableScaling style={styles.label}>{label}</ThemedText>
      <View style={styles.passwordContainer}>
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
              color: palette.inputText, // Yangi ochroq rang berildi
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
          <ThemedText disableScaling style={styles.fieldErrorText}>{error}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function FeedbackBanner({
  message,
  tone,
  palette,
}: {
  message: string;
  tone: FeedbackTone;
  palette: ReturnType<typeof usePasswordPalette>;
}) {
  const isSuccess = tone === "success";

  return (
    <View
      style={[
        styles.feedbackBanner,
        {
          backgroundColor: isSuccess ? palette.successBg : palette.errorBg,
          borderColor: isSuccess ? palette.successBorder : palette.errorBorder,
        },
      ]}
    >
      <Ionicons
        name={isSuccess ? "checkmark-circle-outline" : "alert-circle-outline"}
        size={18}
        color={isSuccess ? semanticColors.success : semanticColors.error}
      />
      <ThemedText
        disableScaling
        style={[
          styles.feedbackText,
          { color: isSuccess ? semanticColors.success : semanticColors.error },
        ]}
      >
        {message}
      </ThemedText>
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
      <ThemedText disableScaling style={styles.validationTitle}>
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
          disableScaling
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
                disableScaling
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

function SaveButton({
  disabled = false,
  isLoading = false,
  label,
  loadingLabel,
  palette,
  onPress,
}: SaveButtonProps) {
  return (
    <Pressable
      disabled={disabled || isLoading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: palette.primary },
        (disabled || isLoading) && styles.primaryButtonDisabled,
        pressed && !disabled && !isLoading && styles.primaryButtonPressed,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          color="#FFFFFF"
          size="small"
          style={styles.buttonLoader}
        />
      ) : null}
      <ThemedText disableScaling style={styles.primaryButtonText}>
        {isLoading ? loadingLabel : label}
      </ThemedText>
    </Pressable>
  );
}

export default function ChangePasswordScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const palette = usePasswordPalette(colorScheme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useContext(I18nContext);
  const [passwords, setPasswords] = useState<Record<PasswordFieldKey, string>>({
    current: "",
    new: "",
    confirm: "",
  });
  const [visibleFields, setVisibleFields] = useState<
    Record<PasswordFieldKey, boolean>
  >({
    current: false,
    new: false,
    confirm: false,
  });
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<PasswordFieldKey, string>>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const isSaveDisabled = isSaving;

  const handlePasswordChange = (key: PasswordFieldKey, value: string) => {
    setPasswords((current) => ({ ...current, [key]: value }));
    setFeedback(null);
    setFieldErrors((current) => {
      const next = { ...current };

      delete next[key];

      if (key === "new") {
        delete next.confirm;
      }

      if (
        (key === "confirm" || key === "new") &&
        value.length > 0 &&
        passwords.new.length > 0
      ) {
        const newPassword = key === "new" ? value : passwords.new;
        const confirmPassword = key === "confirm" ? value : passwords.confirm;

        if (confirmPassword.length > 0 && newPassword !== confirmPassword) {
          next.confirm = t("passwordsDoNotMatch");
        }
      }

      return next;
    });
  };

  const handleToggleVisibility = (key: PasswordFieldKey) => {
    setVisibleFields((current) => ({ ...current, [key]: !current[key] }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<PasswordFieldKey, string>> = {};
    const newPasswordRules = getPasswordRules(passwords.new);

    if (!passwords.current.trim()) {
      nextErrors.current = t("enterOldPassword");
    }

    if (!passwords.new.trim()) {
      nextErrors.new = t("enterNewPassword");
    } else if (newPasswordRules.some((rule) => !rule.passed)) {
      nextErrors.new = t("passwordRequirementsNotMet");
    }

    if (
      passwords.new.trim() &&
      passwords.current.trim() === passwords.new.trim()
    ) {
      nextErrors.new = t("newPasswordMustBeDifferent");
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
      setFeedback(null);
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);
      setFieldErrors({});

      await changeStudentPassword(passwords.current, passwords.new);

      setPasswords({ current: "", new: "", confirm: "" });
      router.back();
      setTimeout(() => {
        showSuccessToast(t("passwordChangedSuccess"));
      }, 250);
    } catch (error: any) {
      if (error instanceof ApiError && error.status === 401) {
        setFieldErrors({ current: t("invalidCurrentPassword") });
        return;
      }

      if (error instanceof ApiError && error.status === 400) {
        if (
          error.message === "invalidCurrentPassword" ||
          error.responseData?.code === "invalidCurrentPassword"
        ) {
          setFieldErrors({ current: t("invalidCurrentPassword") });
          return;
        }

        setFieldErrors({ new: t("passwordRequirementsNotMet") });
        return;
      }

      setFeedback({
        tone: "error",
        message: error?.message || t("savePasswordFailed"),
      });
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
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          contentInsetAdjustmentBehavior="automatic"
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
            <ThemedText disableScaling style={styles.title}>{t("changePassword")}</ThemedText>
            <ThemedText disableScaling style={[styles.subtitle, { color: palette.muted }]}>
              {t("updateAccountPassword")}
            </ThemedText>
          </View>

          <View style={styles.formSection}>
            <PasswordField
              label={t("currentPassword")}
              placeholder={t("enterOldPassword")}
              value={passwords.current}
              isVisible={visibleFields.current}
              error={fieldErrors.current}
              palette={palette}
              onChangeText={(value) => handlePasswordChange("current", value)}
              onToggleVisibility={() => handleToggleVisibility("current")}
            />
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

          {feedback ? (
            <FeedbackBanner
              message={feedback.message}
              tone={feedback.tone}
              palette={palette}
            />
          ) : null}

          <View style={styles.buttonWrapper}>
            <SaveButton
              label={t("savePassword")}
              loadingLabel={t("loading")}
              disabled={isSaveDisabled}
              isLoading={isSaving}
              palette={palette}
              onPress={handleSavePress}
            />
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  headerBlock: {
    marginBottom: 22,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    includeFontPadding: false,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  formSection: {
    gap: 16,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fieldErrorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    fontSize: 16,
    paddingLeft: 16, // Quluf ikonkasidan qolgan boshliq yopildi (46 dan 16 ga)
    paddingRight: 56,
    paddingVertical: Platform.OS === "android" ? 10 : 0,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    padding: 8,
  },
  validationCard: {
    marginTop: 18,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  validationTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  strengthRow: {
    marginBottom: 16,
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
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  feedbackBanner: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  buttonWrapper: {
    marginTop: 32,
    flex: 1,
    justifyContent: "flex-end",
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  buttonLoader: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
