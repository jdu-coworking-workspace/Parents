import React, {
  useCallback,
  useMemo,
  useState,
  useContext,
  useRef,
  useEffect,
} from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { I18nContext } from "@/contexts/i18n-context";
import { useAuth } from "@/contexts/auth-context";
import { useThemeModeContext } from "@/contexts/theme-context";
import { ThemedView } from "@/components/themed-view";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { FontSizeSlider } from "@/components/FontSizeSlider";

// Mock data for student
const mockStudentData = {
  given_name: "Sunnatilla",
  family_name: "Sobitjonov",
  phone_number: "998974551319",
};

const languageData = [
  { code: "uz", label: "O'zbekcha", flag: "🇺🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

const RadioCircle = ({ selected }: { selected: boolean }) => (
  <View
    style={{
      height: 22,
      width: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: selected ? "#3887FE" : "#C6C6C6",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    }}
  >
    {selected ? (
      <View
        style={{
          height: 12,
          width: 12,
          borderRadius: 6,
          backgroundColor: "#3887FE",
        }}
      />
    ) : null}
  </View>
);

interface LanguageSelectionProps {
  language: string;
  selectedLanguage: string;
  onSelect: (language: string) => void;
  flag: string;
}

const LanguageSelection: React.FC<
  LanguageSelectionProps & { isDark: boolean }
> = ({ language, selectedLanguage, onSelect, flag, isDark }) => {
  const selected = selectedLanguage === language;
  return (
    <TouchableOpacity
      key={language}
      style={[
        styles.container1,
        selected && { backgroundColor: isDark ? "#226fc9" : "#EAF2FF" },
      ]}
      onPress={() => onSelect(language)}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <ThemedText style={styles.flag}>{flag}</ThemedText>
        <ThemedText style={{ fontSize: 16 }}>{language}</ThemedText>
      </View>
      <RadioCircle selected={selected} />
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const { toggleTheme, currentColorScheme } = useThemeModeContext();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const isDark = colorScheme === "dark";
  const { language: currentLang, setLanguage, t } = useContext(I18nContext);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const initialLabel =
    languageData.find((l) => l.code === currentLang)?.label ?? "O'zbekcha";
  const [selectedLanguage, setSelectedLanguage] = useState(initialLabel);
  const [isLightModeOn, setIsLightModeOn] = useState(true);
  const [isFontSizeOpen, setIsFontSizeOpen] = useState(false);
  const [previewFontSize, setPreviewFontSize] = useState(1.4);

  // --- Font Size Modal animatsiyasi ---
  const screenHeight = Dimensions.get("window").height;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFontSizeOpen) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFontSizeOpen]);

  const handleLanguageSelect = async (label: string, code: string) => {
    setSelectedLanguage(label);
    setIsLanguageOpen(false);
    // update global language
    try {
      await setLanguage(code as any);
    } catch (e) {
      // ignore
    }
  };

  const handlePresentModal = useCallback(() => {
    setIsLanguageOpen(true);
  }, []);

  const handleToggleLight = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  // Compute display name from authenticated user
  const displayName = useMemo(() => {
    const given = (user?.given_name ?? "").trim();
    const family = (user?.family_name ?? "").trim();
    const combined = [given, family].filter(Boolean).join(" ");
    return combined || "";
  }, [user]);

  const handleLogout = useCallback(() => {
    Alert.alert(t("confirmLogout"), t("logoutMessage"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("logout"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/sign-in");
        },
      },
    ]);
  }, [signOut, router, t]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.infoCard}>
            <ThemedText style={styles.sectionTitle}>
              {t("personalInfo")}
            </ThemedText>
            <View style={styles.infoRow}>
              {displayName ? (
                <View style={styles.row}>
                  <Ionicons
                    name="person-outline"
                    size={22}
                    color={colors.icon}
                    style={styles.infoIcon}
                  />
                  <View>
                    <ThemedText
                      style={[styles.profileInitial, { color: colors.icon }]}
                    >
                      {t("firstName")}
                    </ThemedText>
                    <ThemedText style={styles.profileText}>
                      {displayName}
                    </ThemedText>
                  </View>
                </View>
              ) : null}

              <View style={styles.row}>
                <Ionicons
                  name="mail-outline"
                  size={22}
                  color={colors.icon}
                  style={styles.infoIcon}
                />
                <View>
                  <ThemedText
                    style={[styles.profileInitial, { color: colors.icon }]}
                  >
                    {t("emailaddress")}
                  </ThemedText>
                  <ThemedText style={styles.profileText}>
                    {user?.email ?? ""}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <ThemedText style={styles.sectionTitle}>{t("settings")}</ThemedText>
            <Pressable onPress={handlePresentModal} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: "#64748B" }]}>
                <Ionicons color="#fff" name="language-outline" size={20} />
              </View>
              <ThemedText style={styles.rowLabel}>{t("language")}</ThemedText>
              <View style={styles.rowSpacer} />
              <Ionicons color="#C6C6C6" name="chevron-forward" size={20} />
            </Pressable>

            <Pressable style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: "#64748B" }]}>
                <Ionicons color="#fff" name="lock-closed-outline" size={20} />
              </View>
              <ThemedText style={styles.rowLabel}>
                {t("changePassword")}
              </ThemedText>
              <View style={styles.rowSpacer} />
              <Ionicons color="#C6C6C6" name="chevron-forward" size={20} />
            </Pressable>

            <Pressable
              style={styles.row}
              onPress={() => setIsFontSizeOpen(true)}
            >
              <View style={[styles.rowIcon, { backgroundColor: "#64748B" }]}>
                <Ionicons color="#fff" name="text" size={20} />
              </View>
              <ThemedText style={styles.rowLabel}>{t("textSize")}</ThemedText>
              <View style={styles.rowSpacer} />
              <Ionicons color="#C6C6C6" name="chevron-forward" size={20} />
            </Pressable>

            <Pressable style={styles.row} onPress={handleToggleLight}>
              <View style={[styles.rowIcon, { backgroundColor: "#64748B" }]}>
                <Ionicons
                  color="#fff"
                  name={
                    currentColorScheme === "dark" ? "moon" : "sunny-outline"
                  }
                  size={20}
                />
              </View>
              <ThemedText style={styles.rowLabel}>
                {isLightModeOn ? t("lightMode") : t("darkMode")}
              </ThemedText>
              <View style={styles.rowSpacer} />
              <View
                style={[
                  styles.toggleSwitch,
                  {
                    backgroundColor:
                      currentColorScheme === "dark" ? "#3B82F6" : "#E5E7EB",
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleDot,
                    {
                      backgroundColor:
                        currentColorScheme === "dark" ? "#fff" : "#999",
                      alignSelf:
                        currentColorScheme === "dark"
                          ? "flex-end"
                          : "flex-start",
                    },
                  ]}
                />
              </View>
            </Pressable>
          </View>

          <View style={{ marginTop: 40, marginBottom: 20 }}>
            <Pressable style={styles.submitButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={30} color="#FF4444" />
              <Text style={styles.logoutText}>{t("logout")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isLanguageOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguageOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={() => setIsLanguageOpen(false)}
            style={{ flex: 1 }}
          />
          <View
            style={[
              {
                backgroundColor: colors.background,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingTop: 8,
                paddingBottom: 30,
                paddingHorizontal: 15,
              },
            ]}
          >
            <ThemedText
              style={{
                marginTop: 18,
                marginBottom: 18,
                fontSize: 18,
                alignSelf: "flex-start",
              }}
            >
              {t("language")}
            </ThemedText>
            <ThemedView style={{ width: "100%" }}>
              {languageData.map((l) => (
                <LanguageSelection
                  key={l.code}
                  language={l.label}
                  selectedLanguage={selectedLanguage}
                  onSelect={(label: string) =>
                    handleLanguageSelect(label, l.code)
                  }
                  flag={l.flag}
                  isDark={isDark}
                />
              ))}
            </ThemedView>
          </View>
        </View>
      </Modal>

      {/* Font Size Modal */}
      <Modal
        visible={isFontSizeOpen}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={() => setIsFontSizeOpen(false)}
      >
        <View style={{ flex: 1 }}>
          {/* Qora fon - fade bilan silliq paydo bo'ladi */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.35)", opacity: fadeAnim },
            ]}
          >
            <Pressable
              onPress={() => setIsFontSizeOpen(false)}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Kontent qutisi - pastdan silliq sirpanadi */}
          <Animated.View
            style={[
              styles.fontSizeModalContent,
              {
                backgroundColor: colors.background,
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <FontSizeSlider
              onPreviewChange={setPreviewFontSize}
              textColor={colors.text}
              activeColor="#4182EB"
              inactiveColor="#A1A1A1"
              cardBackgroundColor={isDark ? "#2C2C2E" : "#F2F2F7"}
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    rowGap: 10,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  submitButton: {
    padding: 10,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#FF4444",
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 20,
  },
  infoRow: {
    gap: 20,
    width: "90%",
  },
  infoIcon: {
    marginRight: 15,
  },
  profileText: {
    fontSize: 16,
    fontWeight: "400",
  },
  profileInitial: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#bec0c2",
    borderRadius: 20,
    alignItems: "flex-start",
    position: "relative",
  },
  container1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 4,
    width: "100%",
    backgroundColor: "transparent",
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  flag: {
    fontSize: 22,
    marginRight: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: 50,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 3,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: "400",
  },
  rowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  logoutText: {
    marginLeft: 0,
    fontWeight: "bold",
    color: "#FF4444",
    fontSize: 16,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  fontSizeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  fontSizeModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  fontSizeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  applyButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
  },
});
