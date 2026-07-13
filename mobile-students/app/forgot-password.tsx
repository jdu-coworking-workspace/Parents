import AsyncStorage from "@react-native-async-storage/async-storage";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
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
import { OtpInput, OtpInputRef } from "react-native-otp-entry";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { I18nContext } from "@/contexts/i18n-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  initiateStudentForgotPassword,
  setStudentForgotPassword,
  verifyStudentForgotPasswordCode,
} from "@/services/student-auth";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { getPasswordRules, validatePassword } from "@/utils/password-validation";
import type { TranslationKeys } from "@/types/i18n";
import { ApiError } from "@/services/api-client";

type ForgotPasswordStep = "email" | "verify" | "password";
const LEGACY_EXPIRY_KEY = "forgot_password_code_expiry";
const EXPIRY_KEY = "student_forgot_password_expiry";
const RESEND_COUNT_KEY = "student_forgot_password_resend_count";
const EMAIL_KEY = "student_forgot_password_email";
const STEP_KEY = "student_forgot_password_step";

const BACKEND_ERROR_KEY_BY_MESSAGE: Record<string, keyof TranslationKeys> = {
  "Invalid verification code": "invalidOtp",
  "Verification code has expired": "otpExpired",
  "OTP not verified or verification session expired":
    "forgotPasswordSessionExpired",
  "Password must contain at least 8 characters, 1 number, 1 special character, 1 uppercase, 1 lowercase":
    "passwordRequirementsNotMet",
  "Too many requests. Please try again later": "tooManyAttempts",
  "Too many failed attempts. Please try again later": "tooManyAttempts",
  "Email is not verified in the system. Please contact support.":
    "emailVerificationFailed",
  "Email verification failed. Please contact support.":
    "emailVerificationFailed",
  "Invalid email format": "invalidInput",
};

function resolveForgotPasswordErrorMessage(
  error: unknown,
  t: (key: keyof TranslationKeys) => string,
  fallbackKey: keyof TranslationKeys
): string {
  const apiError = error as ApiError & {
    message_key?: string;
    responseData?: { code?: string; message_key?: string; error?: string };
  };

  const keyCandidate =
    apiError?.code ||
    apiError?.message_key ||
    apiError?.responseData?.code ||
    apiError?.responseData?.message_key;

  if (keyCandidate) {
    const translated = t(keyCandidate as keyof TranslationKeys);
    if (translated && translated !== String(keyCandidate)) {
      return translated;
    }
  }

  const englishMessage =
    apiError?.message ||
    apiError?.responseData?.error ||
    (error instanceof Error ? error.message : "");

  const mappedKey = englishMessage
    ? BACKEND_ERROR_KEY_BY_MESSAGE[englishMessage]
    : undefined;

  if (mappedKey) {
    return t(mappedKey);
  }

  return t(fallbackKey);
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { t } = useContext(I18nContext);
  const colorScheme = useColorScheme() ?? "light";
  const otpInputRef = useRef<OtpInputRef>(null);
  const autoSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVerifyingRef = useRef(false);

  const [step, setStep] = useState<ForgotPasswordStep>("email");
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : ""
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [resendCount, setResendCount] = useState(0);

  useEffect(() => {
    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const restorePersistedResendState = async () => {
      try {
        const [storedExpiry, storedResendCount, storedEmail, storedStep] =
          await Promise.all([
            AsyncStorage.getItem(EXPIRY_KEY),
            AsyncStorage.getItem(RESEND_COUNT_KEY),
            AsyncStorage.getItem(EMAIL_KEY),
            AsyncStorage.getItem(STEP_KEY),
          ]);
        const effectiveStoredExpiry =
          storedExpiry ?? (await AsyncStorage.getItem(LEGACY_EXPIRY_KEY));

        if (!effectiveStoredExpiry || !storedEmail || storedStep !== "verify") {
          return;
        }

        const expiryTime = parseInt(effectiveStoredExpiry, 10);
        const now = Date.now();

        if (Number.isNaN(expiryTime) || now >= expiryTime) {
          await Promise.all([
            AsyncStorage.removeItem(EXPIRY_KEY),
            AsyncStorage.removeItem(LEGACY_EXPIRY_KEY),
            AsyncStorage.removeItem(RESEND_COUNT_KEY),
            AsyncStorage.removeItem(EMAIL_KEY),
            AsyncStorage.removeItem(STEP_KEY),
          ]);
          return;
        }

        setEmail(storedEmail);
        setStep("verify");
        setResendCount(storedResendCount ? parseInt(storedResendCount, 10) : 0);
        setCountdown(Math.floor((expiryTime - now) / 1000));
        setCanResend(false);
      } catch {
        // Ignore restore failures and keep the screen usable.
      }
    };

    restorePersistedResendState();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(step === "verify");
      return;
    }

    setCanResend(false);
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, step]);

  useEffect(() => {
    if (step !== "verify") {
      return;
    }

    const persistVerifyState = async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(STEP_KEY, "verify"),
          AsyncStorage.setItem(EMAIL_KEY, email.trim().toLowerCase()),
          AsyncStorage.setItem(RESEND_COUNT_KEY, String(resendCount)),
        ]);
      } catch {
        // Ignore persistence failures and keep the flow working in-memory.
      }
    };

    if (email.trim()) {
      persistVerifyState();
    }
  }, [email, resendCount, step]);

  const palette = {
    inputBg: colorScheme === "dark" ? "#151718" : "#f8f9fa",
    inputBorder: colorScheme === "dark" ? "#374151" : "#D1D5DB",
    cardBg: colorScheme === "dark" ? "#101417" : "#FFFFFF",
    cardBorder: colorScheme === "dark" ? "#26323A" : "#E5E7EB",
    primary: "#2563EB",
    muted: colorScheme === "dark" ? "#9CA3AF" : "#6B7280",
    error: "#DC2626",
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626",
  };

  const isValidEmail = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase()),
    [email]
  );

  const passwordRules = getPasswordRules(newPassword);

  const passwordScore = passwordRules.filter((rule) => rule.passed).length;
  const isPasswordValid = validatePassword(newPassword);
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordStrength =
    passwordScore <= 1
      ? { label: t("weak"), color: palette.danger }
      : passwordScore <= 3
        ? { label: t("weak"), color: palette.warning }
        : passwordScore <= 4
          ? { label: t("medium"), color: palette.warning }
          : { label: t("strong"), color: palette.success };

  const passwordBarWidth = passwordScore / passwordRules.length;

  const resetLocalState = () => {
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setResetToken("");
    setError("");
  };

  const clearPersistedResendState = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(EXPIRY_KEY),
        AsyncStorage.removeItem(LEGACY_EXPIRY_KEY),
        AsyncStorage.removeItem(RESEND_COUNT_KEY),
        AsyncStorage.removeItem(EMAIL_KEY),
        AsyncStorage.removeItem(STEP_KEY),
      ]);
    } catch {
      // Ignore cleanup failures.
    }
  };

  const persistResendExpiry = async (
    expiryAt: number,
    normalizedEmail: string,
    nextResendCount: number
  ) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(EXPIRY_KEY, String(expiryAt)),
        AsyncStorage.removeItem(LEGACY_EXPIRY_KEY),
        AsyncStorage.setItem(RESEND_COUNT_KEY, String(nextResendCount)),
        AsyncStorage.setItem(EMAIL_KEY, normalizedEmail),
        AsyncStorage.setItem(STEP_KEY, "verify"),
      ]);
    } catch {
      // Ignore persistence failures and keep the flow working in-memory.
    }
  };

  const handleSendCode = async (isResend = false) => {
    if (!isValidEmail) {
      setError(t("emailRequired"));
      return;
    }

    try {
      if (isResend) {
        setIsResending(true);
      } else {
        setIsLoading(true);
      }
      setError("");

      const normalizedEmail = email.trim().toLowerCase();
      const response = await initiateStudentForgotPassword(normalizedEmail);
      const delay = Math.min(60 + resendCount * 30, 300);
      const nextResendCount = isResend ? resendCount + 1 : resendCount;
      const newExpiryAt = Date.now() + delay * 1000;

      if (!isResend) {
        setStep("verify");
      }
      setVerificationCode("");
      setCountdown(delay);
      setCanResend(false);
      setResendCount(nextResendCount);
      await persistResendExpiry(newExpiryAt, normalizedEmail, nextResendCount);

      showSuccessToast(
        isResend
          ? t("forgotPasswordCodeResent").replace(
              "{attempt}",
              String(nextResendCount + 1)
            )
          : response.message_key
            ? t(response.message_key as keyof TranslationKeys)
            : response.message || t("forgotPasswordCodeSent"),
        { duration: "long" }
      );
    } catch (e: any) {
      const message = resolveForgotPasswordErrorMessage(
        e,
        t,
        "verifyEmailError"
      );
      setError(message);
      showErrorToast(message);
    } finally {
      if (isResend) {
        setIsResending(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyCode = async (submittedCode?: string) => {
    if (isVerifyingRef.current || isLoading) {
      return;
    }

    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    const finalCode = (submittedCode || verificationCode).trim();

    if (!isValidEmail) {
      setError(t("emailRequired"));
      return;
    }

    if (finalCode.length !== 6) {
      const message = t("enterVerificationCode");
      setError(message);
      showErrorToast(message);
      return;
    }

    try {
      isVerifyingRef.current = true;
      setIsLoading(true);
      setError("");

      const result = await verifyStudentForgotPasswordCode(
        email.trim().toLowerCase(),
        finalCode
      );

      setResetToken(result.reset_token);
      setVerificationCode(finalCode);
      setStep("password");
      await clearPersistedResendState();
      showSuccessToast(
        result.message_key
          ? t(result.message_key as keyof TranslationKeys)
          : result.message || t("verificationCodeVerified" as keyof TranslationKeys)
      );
    } catch (e: any) {
      otpInputRef.current?.clear();
      setVerificationCode("");
      const message = resolveForgotPasswordErrorMessage(e, t, "invalidOtp");
      setError(message);
      showErrorToast(message);
    } finally {
      isVerifyingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!isPasswordValid) {
      const message = t("passwordRequirementsNotMet");
      setError(message);
      showErrorToast(message);
      return;
    }

    if (!passwordsMatch) {
      const message = t("passwordsDoNotMatch");
      setError(message);
      showErrorToast(message);
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      await setStudentForgotPassword(
        email.trim().toLowerCase(),
        newPassword,
        resetToken
      );

      showSuccessToast(t("passwordCreatedSuccessfully"), {
        duration: "long",
      });
      await clearPersistedResendState();
      router.replace("/sign-in");
    } catch (e: any) {
      const message = resolveForgotPasswordErrorMessage(
        e,
        t,
        "savePasswordFailed"
      );
      setError(message);
      showErrorToast(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    if (step === "password") {
      setStep("verify");
      setError("");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    if (step === "verify") {
      setStep("email");
      resetLocalState();
      void clearPersistedResendState();
      setResendCount(0);
      setCountdown(0);
      setCanResend(false);
      return;
    }

    void clearPersistedResendState();
    router.replace("/sign-in");
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
              <View style={styles.headerRow}>
                <Pressable
                  onPress={handleGoBack}
                  style={styles.backButton}
                  disabled={isLoading}
                >
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={Colors[colorScheme].text}
                  />
                </Pressable>
                <View style={styles.headerBlock}>
                  <ThemedText style={styles.title}>
                    {step === "password"
                      ? t("createNewPasswordTitle")
                      : t("resetPasswordTitle")}
                  </ThemedText>
                </View>
              </View>

              {step === "email" ? (
                <>
                  <View style={styles.inputBlock}>
                    <ThemedText style={styles.label}>{t("email")}</ThemedText>
                    <TextInput
                      value={email}
                      onChangeText={(value) => {
                        setEmail(value);
                        setError("");
                      }}
                      placeholder={t("enterEmail")}
                      placeholderTextColor={palette.muted}
                      style={[
                        styles.input,
                        {
                          color: Colors[colorScheme].text,
                          backgroundColor: palette.inputBg,
                          borderColor: palette.inputBorder,
                        },
                      ]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                  </View>

                  <Pressable
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor:
                          isLoading || !isValidEmail
                            ? "#9CA3AF"
                            : palette.primary,
                      },
                    ]}
                    onPress={() => handleSendCode(false)}
                    disabled={isLoading || !isValidEmail}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.primaryButtonText}>
                        {t("sendCode")}
                      </ThemedText>
                    )}
                  </Pressable>
                </>
              ) : null}

              {step === "verify" ? (
                <>
                  <ThemedText
                    style={[styles.description, { color: palette.muted }]}
                  >
                    {t("verificationCodeSent")}
                  </ThemedText>
                  <ThemedText
                    style={[styles.emailDisplay, { color: palette.primary }]}
                  >
                    {email.trim().toLowerCase()}
                  </ThemedText>

                  <ThemedText style={styles.label}>
                    {t("enterVerificationCode")}
                  </ThemedText>

                  <OtpInput
                    ref={otpInputRef}
                    numberOfDigits={6}
                    onTextChange={(code: string) => {
                      if (autoSubmitTimeoutRef.current) {
                        clearTimeout(autoSubmitTimeoutRef.current);
                        autoSubmitTimeoutRef.current = null;
                      }
                      setVerificationCode(code);
                      setError("");
                    }}
                    onFilled={(code: string) => {
                      if (isVerifyingRef.current || isLoading) {
                        return;
                      }
                      setVerificationCode(code);
                      autoSubmitTimeoutRef.current = setTimeout(() => {
                        void handleVerifyCode(code);
                      }, 500);
                    }}
                    autoFocus
                    focusColor={palette.primary}
                    focusStickBlinkingDuration={500}
                    theme={{
                      containerStyle: styles.otpContainer,
                      pinCodeContainerStyle: {
                        ...styles.otpInput,
                        backgroundColor: palette.inputBg,
                        borderColor: palette.inputBorder,
                      },
                      pinCodeTextStyle: {
                        ...styles.otpText,
                        color: Colors[colorScheme].text,
                      },
                      focusedPinCodeContainerStyle: {
                        borderColor: palette.primary,
                        borderWidth: 2,
                      },
                    }}
                    textInputProps={{
                      textContentType: "oneTimeCode",
                      autoComplete: "one-time-code",
                      keyboardType: "number-pad",
                    }}
                  />

                  {countdown > 0 ? (
                    <ThemedText
                      style={[styles.countdown, { color: palette.muted }]}
                    >
                      {t("codeWillExpire").replace(
                        "{seconds}",
                        countdown.toString()
                      )}
                    </ThemedText>
                  ) : (
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={async () => {
                        if (!canResend || isLoading || isResending) return;
                        await handleSendCode(true);
                      }}
                      disabled={!canResend || isLoading || isResending}
                    >
                      <View style={styles.resendRow}>
                        {isResending ? (
                          <ActivityIndicator
                            size="small"
                            color={palette.primary}
                            style={styles.resendLoader}
                          />
                        ) : null}
                        <ThemedText
                          style={{
                            color:
                              canResend && !isLoading && !isResending
                                ? palette.primary
                                : palette.muted,
                          }}
                        >
                          {resendCount > 0
                            ? `${t("resendCode")} (${resendCount + 1})`
                            : t("resendCode")}
                        </ThemedText>
                      </View>
                    </Pressable>
                  )}

                  <Pressable
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor:
                          isLoading || verificationCode.length !== 6
                            ? "#9CA3AF"
                            : palette.primary,
                      },
                    ]}
                    onPress={() => handleVerifyCode()}
                    disabled={isLoading || verificationCode.length !== 6}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.primaryButtonText}>
                        {t("verify")}
                      </ThemedText>
                    )}
                  </Pressable>
                </>
              ) : null}

              {step === "password" ? (
                <>
                  <ThemedText
                    style={[styles.description, { color: palette.muted }]}
                  >
                    {t("enterNewPasswordText")}
                  </ThemedText>

                  <View style={styles.inputBlock}>
                    <ThemedText style={styles.label}>{t("newPassword")}</ThemedText>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        value={newPassword}
                        onChangeText={(value) => {
                          setNewPassword(value);
                          setError("");
                        }}
                        placeholder={t("enterNewPassword")}
                        placeholderTextColor={palette.muted}
                        style={[
                          styles.input,
                          styles.passwordInput,
                          {
                            color: Colors[colorScheme].text,
                            backgroundColor: palette.inputBg,
                            borderColor: palette.inputBorder,
                          },
                        ]}
                        secureTextEntry={!showNewPassword}
                        editable={!isLoading}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Pressable
                        style={styles.eyeIcon}
                        onPress={() => setShowNewPassword((current) => !current)}
                      >
                        <Ionicons
                          name={showNewPassword ? "eye-off" : "eye"}
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
                          style={[
                            styles.strengthLabel,
                            { color: passwordStrength.color },
                          ]}
                        >
                          {passwordStrength.label}
                        </ThemedText>
                      </View>

                      <View style={styles.rulesList}>
                        {passwordRules.map((rule) => (
                          <View key={rule.key} style={styles.ruleRow}>
                            <Ionicons
                              name={rule.passed ? "checkmark-circle" : "close-circle"}
                              size={20}
                              color={rule.passed ? palette.success : palette.danger}
                              style={styles.ruleIcon}
                            />
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
                              {t(rule.key)}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.inputBlock}>
                    <ThemedText style={styles.label}>
                      {t("confirmPassword")}
                    </ThemedText>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        value={confirmPassword}
                        onChangeText={(value) => {
                          setConfirmPassword(value);
                          setError("");
                        }}
                        placeholder={t("enterConfirmPassword")}
                        placeholderTextColor={palette.muted}
                        style={[
                          styles.input,
                          styles.passwordInput,
                          {
                            color: Colors[colorScheme].text,
                            backgroundColor: palette.inputBg,
                            borderColor: palette.inputBorder,
                          },
                        ]}
                        secureTextEntry={!showConfirmPassword}
                        editable={!isLoading}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Pressable
                        style={styles.eyeIcon}
                        onPress={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off" : "eye"}
                          size={20}
                          color={palette.muted}
                        />
                      </Pressable>
                    </View>
                  </View>

                  <Pressable
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor:
                          isLoading || !isPasswordValid || !passwordsMatch
                            ? "#9CA3AF"
                            : palette.primary,
                      },
                    ]}
                    onPress={handleSavePassword}
                    disabled={isLoading || !isPasswordValid || !passwordsMatch}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.primaryButtonText}>
                        {t("saveNewPassword")}
                      </ThemedText>
                    )}
                  </Pressable>
                </>
              ) : null}

              {error ? (
                <ThemedText
                  style={[styles.feedbackText, { color: palette.error }]}
                >
                  {error}
                </ThemedText>
              ) : null}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerBlock: {
    flex: 1,
  },
  title: {
    fontWeight: "600",
    fontSize: 40,
    lineHeight: 48,
    includeFontPadding: false,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  emailDisplay: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
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
    paddingVertical: Platform.OS === "android" ? 10 : 0,
    textAlignVertical: "center",
    includeFontPadding: false,
    fontSize: 16,
    flex: 1,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  passwordInput: {
    paddingRight: 56,
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    padding: 12,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
  },
  otpText: {
    fontSize: 18,
    fontWeight: "600",
  },
  countdown: {
    fontSize: 14,
    marginBottom: 20,
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
  },
  strengthBarFill: {
    height: "100%",
    borderRadius: 999,
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
  secondaryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resendLoader: {
    marginRight: 8,
  },
  feedbackText: {
    marginTop: 12,
    fontSize: 13,
  },
});
