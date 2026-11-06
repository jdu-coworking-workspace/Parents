import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { I18nContext } from "@/contexts/i18n-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchStudentFaqs, type StudentFaq } from "@/services/student-faq";

export default function FaqScreen() {
  const { t } = useContext(I18nContext);
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const isDark = colorScheme === "dark";
  const [faqs, setFaqs] = useState<StudentFaq[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadFaqs = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const loadedFaqs = await fetchStudentFaqs();
      setFaqs(loadedFaqs);
      setOpenId(loadedFaqs[0]?.id ?? null);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading remote FAQ data is the screen's external synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFaqs();
  }, [loadFaqs]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <ThemedText disableScaling style={styles.intro}>
        {t("needHelp")}
      </ThemedText>
      {isLoading ? (
        <ActivityIndicator color={colors.tint} style={styles.loader} />
      ) : null}
      {hasError ? (
        <View style={styles.errorBox}>
          <ThemedText disableScaling style={styles.errorText}>
            {t("faqLoadError")}
          </ThemedText>
          <Pressable onPress={() => void loadFaqs()}>
            <ThemedText disableScaling style={[styles.retry, { color: colors.tint }]}>
              {t("tryAgain")}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      {!isLoading && !hasError && faqs.length === 0 ? (
        <ThemedText disableScaling style={styles.empty}>
          {t("faqEmpty")}
        </ThemedText>
      ) : null}
      {faqs.map((item) => {
        const open = openId === item.id;
        return (
          <View
            key={item.id}
            style={[
              styles.card,
              { borderColor: isDark ? "#2C2C2E" : "#E5E5EA" },
            ]}
          >
            <Pressable
              style={styles.questionRow}
              onPress={() => setOpenId(open ? null : item.id)}
            >
              <ThemedText disableScaling style={styles.question}>
                {item.question}
              </ThemedText>
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={18}
                color="#8E8E93"
              />
            </Pressable>
            {open ? (
              <ThemedText disableScaling style={styles.answer}>
                {item.answer}
              </ThemedText>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 10,
  },
  intro: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  loader: {
    marginVertical: 12,
  },
  errorBox: {
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    textAlign: "center",
  },
  retry: {
    fontWeight: "600",
  },
  empty: {
    opacity: 0.7,
    textAlign: "center",
    marginTop: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  answer: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
});
