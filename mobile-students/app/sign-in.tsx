import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { initiateStudentLogin } from "@/services/student-auth";
import { useAuth } from "@/contexts/auth-context";
import { Ionicons } from "@expo/vector-icons";

export default function SignInScreen() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    signIn,
    signInWithGoogle,
    completeFirstLogin,
    setFirstLoginChallenge,
    isSignedIn,
    isLoading: isAuthLoading,
  } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isAuthLoading && isSignedIn) {
      router.replace("/(tabs)/(home)");
    }
  }, [isAuthLoading, isSignedIn, router]);

  const colorScheme = useColorScheme() ?? "light";
  const passwordPlaceholder = "Email yoki shaxsiy password";

  const palette = {
    inputBg: colorScheme === "dark" ? "#151718" : "#f8f9fa",
    inputBorder: colorScheme === "dark" ? "#374151" : "#D1D5DB",
    primary: "#2563EB",
    muted: colorScheme === "dark" ? "#9CA3AF" : "#6B7280",
    error: "#DC2626",
    info: "#2563EB",
  };

  const handleEmailNext = async () => {
    if (!email.trim()) {
      setError("Email kiriting");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setInfo("");

      const response = await initiateStudentLogin(email.trim().toLowerCase());
      setInfo(response.message || "Emailga temporary password yuborildi.");
      setStep("password");
      setPassword("");
    } catch (e: any) {
      // Check if it's a 404 error (email not found in system)
      if (e?.status === 404) {
        setError(
          "Your email address was not found in the system. Please contact your school administrator.",
        );
      } else {
        setError(
          e?.message || "An error occurred while verifying the email address.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setError("Password kiriting");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setInfo("");

      await signIn(email.trim().toLowerCase(), password);

      router.replace("/(tabs)/(home)");
    } catch (e: any) {
      if (e?.status === 403) {
        setFirstLoginChallenge({
          email: email.trim().toLowerCase(),
          tempPassword: password,
        });
        router.push("/new-psswd" as any);
        return;
      }

      setError(e?.message || "Login xatoligi");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSetup = async () => {
    if (!password.trim()) {
      setError("Temporary password kiriting");
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
        email.trim().toLowerCase(),
        password,
        newPassword,
      );

      router.replace("/(tabs)/(home)");
    } catch (e: any) {
      setError(e?.message || "Password saqlashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError("");
      setInfo("");

      await signInWithGoogle();
      router.replace("/(tabs)/(home)");
    } catch (e: any) {
      const message =
        e?.message === "user_not_found"
          ? "Your email address was not found in the system. Please contact your school administrator."
          : e?.message === "oauth_error"
            ? "Google authentication failed. Please try again."
            : e?.message === "callback_error"
              ? "Google callback processing failed. Please try again."
              : e?.message === "oauth_missing_params"
                ? "Google authentication could not be completed. Missing required login data. Please try again."
                : "Google login failed. Please try again.";
      setError(message);
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
                  Welcome,{"\n"}Student
                </ThemedText>
              </View>

              <Pressable
                style={[
                  styles.googleButton,
                  {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.inputBorder,
                    opacity: isLoading ? 0.75 : 1,
                  },
                ]}
                onPress={handleGoogleLogin}
                disabled={isLoading || isAuthLoading}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <ThemedText
                  style={[
                    styles.googleButtonText,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  Sign in with Google
                </ThemedText>
              </Pressable>

              <View
                style={[
                  styles.divider,
                  { borderTopColor: palette.inputBorder },
                ]}
              >
                <View
                  style={[
                    styles.dividerDot,
                    { backgroundColor: palette.inputBorder },
                  ]}
                />
              </View>

              <View style={styles.inputBlock}>
                <ThemedText style={styles.label}>Gmail</ThemedText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="student@gmail.com"
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
                  editable={step === "email" && !isLoading}
                />
              </View>

              {step !== "email" ? (
                <View style={styles.inputBlock}>
                  <ThemedText style={styles.label}>Password</ThemedText>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder={passwordPlaceholder}
                      placeholderTextColor={palette.muted}
                      style={[
                        styles.input,
                        styles.passwordInput,
                        {
                          color: palette.muted,
                          backgroundColor: palette.inputBg,
                          borderColor: palette.inputBorder,
                        },
                      ]}
                      secureTextEntry={!showPassword}
                      editable={step === "password" && !isLoading}
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
              ) : null}

              {info ? (
                <ThemedText
                  style={[styles.feedbackText, { color: palette.info }]}
                >
                  {info}
                </ThemedText>
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
                onPress={
                  step === "email" ? handleEmailNext : handlePasswordSubmit
                }
                disabled={isLoading}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {isLoading
                    ? "Loading..."
                    : step === "email"
                      ? "Next"
                      : "Sign in"}
                </ThemedText>
              </Pressable>

              {step !== "email" ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setStep("email");
                    setPassword("");
                    setError("");
                    setInfo("");
                    setEmail("");
                  }}
                  disabled={isLoading}
                >
                  <ThemedText style={{ color: Colors[colorScheme].text }}>
                    Back
                  </ThemedText>
                </Pressable>
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
  passwordInput: {
    paddingRight: 56,
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
  googleButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dividerDot: {
    position: "absolute",
    alignSelf: "center",
    left: "50%",
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    borderTopWidth: 1,
    paddingHorizontal: 0,
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: "center",
  },
});
