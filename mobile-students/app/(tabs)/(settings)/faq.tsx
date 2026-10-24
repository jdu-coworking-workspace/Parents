import React, { useContext, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { studentFaqs } from "@/constants/faq";
import { Colors } from "@/constants/theme";
import { I18nContext } from "@/contexts/i18n-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function FaqScreen() {
  const { t } = useContext(I18nContext);
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const isDark = colorScheme === "dark";
  const [openId, setOpenId] = useState<string | null>(
    studentFaqs[0]?.id ?? null,
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <ThemedText disableScaling style={styles.intro}>
        {t("faq")}
      </ThemedText>
      {studentFaqs.map((item) => {
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
