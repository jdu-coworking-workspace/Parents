import React, { useContext } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { I18nContext } from "@/contexts/i18n-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type MessageSort = "newest" | "oldest";
export type MessagePeriod = "all" | "today" | "7d" | "30d";

type FilterableMessage = {
  title: string;
  content: string;
  sent_time: string;
};

const periods: MessagePeriod[] = ["all", "today", "7d", "30d"];

export function parseMessageDate(sentTime: string): Date | null {
  if (!sentTime) return null;
  if (sentTime.includes("T")) {
    const date = new Date(sentTime);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(`${sentTime.replace(" ", "T")}:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function matchesPeriod(sentTime: string, period: MessagePeriod) {
  if (period === "all") return true;
  const date = parseMessageDate(sentTime);
  if (!date) return false;
  const start = startOfLocalDay(new Date());
  if (period === "today") return date >= start;
  start.setDate(start.getDate() - (period === "7d" ? 6 : 29));
  return date >= start;
}

export function filterMessages<T extends FilterableMessage>(
  messages: T[],
  options: { search: string; sort: MessageSort; period: MessagePeriod },
): T[] {
  const query = options.search.trim().toLowerCase();
  const filtered = messages.filter((message) => {
    if (!matchesPeriod(message.sent_time, options.period)) return false;
    if (!query) return true;
    const haystack =
      `${message.title} ${message.content.replace(/<[^>]+>/g, " ")}`.toLowerCase();
    return haystack.includes(query);
  });

  return [...filtered].sort((a, b) => {
    const aTime = parseMessageDate(a.sent_time)?.getTime() ?? 0;
    const bTime = parseMessageDate(b.sent_time)?.getTime() ?? 0;
    return options.sort === "oldest" ? aTime - bTime : bTime - aTime;
  });
}

export default function MessageFilters({
  search,
  onSearchChange,
  sort,
  onSortChange,
  period,
  onPeriodChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  sort: MessageSort;
  onSortChange: (value: MessageSort) => void;
  period: MessagePeriod;
  onPeriodChange: (value: MessagePeriod) => void;
}) {
  const { t } = useContext(I18nContext);
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const chipBg = isDark ? "#1C1C1E" : "#F2F2F7";
  const activeBg = "#005678";

  const periodLabel: Record<MessagePeriod, string> = {
    all: t("allTime"),
    today: t("today"),
    "7d": t("last7Days"),
    "30d": t("last30Days"),
  };

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: chipBg,
            borderColor: isDark ? "#2C2C2E" : "#E5E5EA",
          },
        ]}
      >
        <Ionicons name="search" size={18} color="#8E8E93" />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={t("searchMessages")}
          placeholderTextColor="#8E8E93"
          style={[styles.input, { color: isDark ? "#FFFFFF" : "#111111" }]}
        />
        {search ? (
          <Pressable onPress={() => onSearchChange("")}>
            <Ionicons name="close-circle" size={18} color="#8E8E93" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.row}>
        {(["newest", "oldest"] as MessageSort[]).map((value) => {
          const active = sort === value;
          return (
            <Pressable
              key={value}
              onPress={() => onSortChange(value)}
              style={[
                styles.chip,
                { backgroundColor: active ? activeBg : chipBg },
              ]}
            >
              <ThemedText
                disableScaling
                style={{ color: active ? "#FFFFFF" : undefined }}
              >
                {value === "newest" ? t("newest") : t("oldest")}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        {periods.map((value) => {
          const active = period === value;
          return (
            <Pressable
              key={value}
              onPress={() => onPeriodChange(value)}
              style={[
                styles.chip,
                { backgroundColor: active ? activeBg : chipBg },
              ]}
            >
              <ThemedText
                disableScaling
                style={{ color: active ? "#FFFFFF" : undefined }}
              >
                {periodLabel[value]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 15,
    paddingTop: 12,
    gap: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
