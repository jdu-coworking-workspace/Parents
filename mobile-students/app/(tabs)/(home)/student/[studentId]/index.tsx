import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateTime } from "luxon";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BrandColors, Colors, colors } from "@/constants/theme";
import { I18nContext } from "@/contexts/i18n-context";
import { useAuth } from "@/contexts/auth-context";
import { useMessageContext } from "@/contexts/message-context";
import {
  fetchStudentMessages,
  fetchStudentUnreadCount,
} from "@/services/student-messages";
import type { Message } from "@/types/message";

const PAGE_SIZE = 5;
type MessageFilter =
  | "read"
  | "unread"
  | "date"
  | "favorite"
  | "pinned"
  | "important";
const MESSAGE_PREFERENCES_KEY = "student-message-preferences";

function mergeIncomingMessages(
  prev: Message[],
  incoming: Message[],
): Message[] {
  if (prev.length === 0) {
    return incoming;
  }

  const prevIds = new Set(prev.map((message) => message.id));
  const incomingById = new Map(
    incoming.map((message) => [message.id, message]),
  );

  const newMessages = incoming.filter((message) => !prevIds.has(message.id));
  const updatedPrev = prev.map(
    (message) => incomingById.get(message.id) ?? message,
  );

  return [...newMessages, ...updatedPrev];
}

function getMessagePreview(content: string) {
  const tagRegex =
    /<img\b[^>]*\bsrc=["'][^"']*["'][^>]*>|<\/?[a-z][a-z0-9]*\b[^>]*>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let text = "";

  while ((match = tagRegex.exec(content))) {
    text += content.slice(lastIndex, match.index);
    const tag = match[0].toLowerCase();
    if (
      tag.startsWith("</p") ||
      tag.startsWith("</div") ||
      tag.startsWith("</li") ||
      /^<\/h[1-6]\b/.test(tag) ||
      /^<br\s*\/?\s*>/.test(tag)
    ) {
      text += "\n";
    }
    lastIndex = match.index + match[0].length;
  }

  text += content.slice(lastIndex);

  return text
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) => {
      const entities: Record<string, string> = {
        "&nbsp;": " ",
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'",
      };
      return entities[entity] ?? entity;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function getMessageDateTime(sentTime: string) {
  if (sentTime.includes("T")) {
    return DateTime.fromISO(sentTime, { zone: "utc" }).toLocal();
  }

  return DateTime.fromFormat(sentTime, "yyyy-MM-dd HH:mm", {
    zone: "utc",
  }).toLocal();
}

function getImportanceLabel(
  priority: Message["priority"],
  t: (k: any) => string,
) {
  if (priority === "high") return t("critical");
  if (priority === "medium") return t("important");
  return t("ordinary");
}

function getImportanceBadgeStyle(
  priority: Message["priority"],
  isRead: boolean,
) {
  const baseStyle = {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    color: "white",
    fontSize: 12,
    textAlign: "center" as const,
    opacity: isRead ? 0.6 : 1,
  };

  switch (priority) {
    case "high":
      return { ...baseStyle, backgroundColor: "red" };
    case "medium":
      return { ...baseStyle, backgroundColor: "orange" };
    case "low":
      return { ...baseStyle, backgroundColor: "green" };
    default:
      return baseStyle;
  }
}

export default function StudentMessagesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const backgroundColor = Colors[colorScheme].background;
  const { t } = useContext(I18nContext);
  const { user } = useAuth();
  const { studentId } = useLocalSearchParams<{
    studentId?: string;
    givenName?: string;
    familyName?: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filters, setFilters] = useState<MessageFilter[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(DateTime.local().startOf("month"));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(
    null,
  );
  const [pinnedMessageIds, setPinnedMessageIds] = useState<number[]>([]);
  const [favoriteMessageIds, setFavoriteMessageIds] = useState<number[]>([]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<
    "any" | Message["priority"]
  >("any");

  const { setUnreadCount, refreshVersion } = useMessageContext();

  const readButNotSentMessageIDs = useRef<number[]>([]);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const lastHandledRefreshVersion = useRef(refreshVersion);

  messagesRef.current = messages;

  const preferencesKey = user
    ? `${MESSAGE_PREFERENCES_KEY}:${user.id}`
    : null;

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      setPreferencesLoaded(false);
      setPinnedMessageIds([]);
      setFavoriteMessageIds([]);

      if (!preferencesKey) {
        setPreferencesLoaded(true);
        return;
      }

      try {
        const stored = await AsyncStorage.getItem(preferencesKey);
        if (cancelled) return;

        if (stored) {
          const parsed = JSON.parse(stored) as {
            pinnedMessageIds?: unknown;
            favoriteMessageIds?: unknown;
          };
          setPinnedMessageIds(
            Array.isArray(parsed.pinnedMessageIds)
              ? parsed.pinnedMessageIds.filter(
                  (id): id is number => typeof id === "number",
                )
              : [],
          );
          setFavoriteMessageIds(
            Array.isArray(parsed.favoriteMessageIds)
              ? parsed.favoriteMessageIds.filter(
                  (id): id is number => typeof id === "number",
                )
              : [],
          );
        }
      } catch (error) {
        console.error("Error loading message preferences:", error);
      } finally {
        if (!cancelled) setPreferencesLoaded(true);
      }
    };

    void loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [preferencesKey]);

  useEffect(() => {
    if (!preferencesLoaded || !preferencesKey) return;

    void AsyncStorage.setItem(
      preferencesKey,
      JSON.stringify({ pinnedMessageIds, favoriteMessageIds }),
    ).catch((error) => {
      console.error("Error saving message preferences:", error);
    });
  }, [
    favoriteMessageIds,
    pinnedMessageIds,
    preferencesKey,
    preferencesLoaded,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch and update unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const count = await fetchStudentUnreadCount();
      if (isMountedRef.current) {
        setUnreadCount(count);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [setUnreadCount]);

  const loadMessages = useCallback(
    async ({
      refresh = false,
      loadMore = false,
      silent = false,
    }: {
      refresh?: boolean;
      loadMore?: boolean;
      silent?: boolean;
    } = {}) => {
      if (isFetchingRef.current && silent) {
        return;
      }

      try {
        isFetchingRef.current = true;

        if (!silent) {
          if (refresh) {
            setIsRefreshing(true);
          } else if (loadMore) {
            setIsLoadingMore(true);
          } else {
            setIsLoading(true);
          }
          setIsError(false);
        }

        const currentMessages = messagesRef.current;
        const lastMessage =
          loadMore && currentMessages.length > 0
            ? currentMessages[currentMessages.length - 1]
            : null;

        const fetched = await fetchStudentMessages({
          last_post_id: loadMore && lastMessage ? lastMessage.id : 0,
          last_sent_at: loadMore && lastMessage ? lastMessage.sent_time : null,
          read_post_ids: readButNotSentMessageIDs.current,
        });

        if (readButNotSentMessageIDs.current.length > 0) {
          readButNotSentMessageIDs.current = [];
        }

        if (!isMountedRef.current) {
          return;
        }

        setMessages((prev) => {
          if (loadMore) {
            const existingIds = new Set(prev.map((message) => message.id));
            const nextMessages = fetched.filter(
              (message) => !existingIds.has(message.id),
            );
            return [...prev, ...nextMessages];
          }

          if (refresh || silent) {
            return mergeIncomingMessages(prev, fetched);
          }

          return fetched;
        });

        if (loadMore || (!refresh && !silent)) {
          setHasMore(fetched.length >= PAGE_SIZE);
        }
        setIsError(false);
      } catch (error) {
        console.error("Error loading student messages:", error);
        if (isMountedRef.current && !silent) {
          setIsError(true);
        }
      } finally {
        isFetchingRef.current = false;
        if (isMountedRef.current && !silent) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [],
  );

  const syncInbox = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent && isFetchingRef.current) {
        return;
      }
      await loadMessages({ refresh: true, silent });
      await refreshUnreadCount();
    },
    [loadMessages, refreshUnreadCount],
  );

  useFocusEffect(
    useCallback(() => {
      const initLoad = async () => {
        const hasCached = messagesRef.current.length > 0;
        if (hasCached) {
          await loadMessages({ refresh: true, silent: true });
        } else {
          await loadMessages();
        }
        await refreshUnreadCount();
      };

      void initLoad();
    }, [loadMessages, refreshUnreadCount]),
  );

  // Push / AppState / new unread → merge newest messages, keep loaded pages
  useEffect(() => {
    if (refreshVersion === lastHandledRefreshVersion.current) {
      return;
    }
    lastHandledRefreshVersion.current = refreshVersion;

    if (!isMountedRef.current) {
      return;
    }

    void syncInbox({ silent: true });
  }, [refreshVersion, syncInbox]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => {
        backHandler.remove();
      };
    }, []),
  );

  const handleOpenMessage = (message: Message) => {
    if (!message.viewed_at) {
      readButNotSentMessageIDs.current = Array.from(
        new Set([...readButNotSentMessageIDs.current, message.id]),
      );

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? { ...item, viewed_at: item.viewed_at ?? message.sent_time }
            : item,
        ),
      );

      // Optimistically decrement unread count
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    }

    router.push({
      pathname: "/(tabs)/(home)/student/[studentId]/message/[id]",
      params: {
        studentId: studentId ?? "",
        id: String(message.id),
      },
    });
  };

  const visibleMessages = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const filtered = messages.filter((message) => {
      const matchesSearch =
        !query ||
        `${message.title} ${getMessagePreview(message.content)}`
          .toLocaleLowerCase()
          .includes(query);
      const matchesStatus =
        !filters.some((item) => item === "read" || item === "unread") ||
        filters.some(
          (item) =>
            (item === "read" && !!message.viewed_at) ||
            (item === "unread" && !message.viewed_at),
        );
      const messageDate = getMessageDateTime(message.sent_time).toISODate();
      const matchesDate = !selectedDate || messageDate === selectedDate;
      const matchesFavorite =
        !filters.includes("favorite") ||
        favoriteMessageIds.includes(message.id);
      const matchesPinned =
        !filters.includes("pinned") || pinnedMessageIds.includes(message.id);
      const matchesImportant =
        !filters.includes("important") || message.priority === "high";
      const matchesPriority =
        priorityFilter === "any" || message.priority === priorityFilter;
      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate &&
        matchesFavorite &&
        matchesPinned &&
        matchesImportant &&
        matchesPriority
      );
    });

    return [...filtered].sort((a, b) => {
      const pinnedDifference =
        Number(pinnedMessageIds.includes(b.id)) -
        Number(pinnedMessageIds.includes(a.id));
      if (pinnedDifference !== 0) return pinnedDifference;
      if (filters.includes("date")) {
        return (
          new Date(b.sent_time.replace(" ", "T")).getTime() -
          new Date(a.sent_time.replace(" ", "T")).getTime()
        );
      }
      return 0;
    });
  }, [
    favoriteMessageIds,
    filters,
    messages,
    pinnedMessageIds,
    priorityFilter,
    searchQuery,
    selectedDate,
  ]);

  const pinnedVisibleMessages = visibleMessages.filter((message) =>
    pinnedMessageIds.includes(message.id),
  );
  const allVisibleMessages = visibleMessages.filter(
    (message) => !pinnedMessageIds.includes(message.id),
  );
  const displayMessages =
    filters.length === 0
      ? [...pinnedVisibleMessages, ...allVisibleMessages]
      : visibleMessages;

  const selectedMessage = messages.find(
    (message) => message.id === selectedMessageId,
  );

  const handleCopyLink = async () => {
    if (selectedMessageId === null) return;
    await Clipboard.setStringAsync(
      `https://students.appuri.jp/messages/${selectedMessageId}`,
    );
    setSelectedMessageId(null);
  };

  const handleTogglePin = () => {
    if (selectedMessageId === null) return;
    setPinnedMessageIds((prev) =>
      prev.includes(selectedMessageId)
        ? prev.filter((id) => id !== selectedMessageId)
        : [selectedMessageId, ...prev],
    );
    setSelectedMessageId(null);
  };

  const handleToggleFavorite = (messageId: number) => {
    setFavoriteMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId],
    );
  };

  const handleMarkUnread = () => {
    if (selectedMessageId === null) return;
    const selectedId = selectedMessageId;
    setMessages((prev) =>
      prev.map((item) =>
        item.id === selectedId ? { ...item, viewed_at: null } : item,
      ),
    );
    setUnreadCount((prev) => prev + 1);
    setSelectedMessageId(null);
  };

  const resetFilters = () => {
    setFilters([]);
    setSelectedDate(null);
    setPriorityFilter("any");
    setIsFilterOpen(false);
  };

  if (isLoading && messages.length === 0) {
    return (
      <ThemedView style={[styles.centeredContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={BrandColors[colorScheme]} />
        <ThemedText style={styles.loadingText}>{t("loading")}</ThemedText>
      </ThemedView>
    );
  }

  if (isError && messages.length === 0) {
    return (
      <ThemedView style={[styles.centeredContainer, { backgroundColor }]}>
        <ThemedText style={styles.errorText}>
          {t("errorLoadingMessages")}
        </ThemedText>
        <Pressable
          style={styles.retryButton}
          onPress={() => void loadMessages({ refresh: true })}
        >
          <ThemedText style={styles.retryButtonText}>
            {t("tryAgain")}
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const messageToolbar = (
    <View style={styles.toolbar}>
      <View style={styles.searchFilterRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#F2F2F7",
              borderColor: "#3B81F6",
              borderWidth: 1.5,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={isSearchFocused ? BrandColors[colorScheme] : "#8E8E93"}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder={t("searchMessages")}
            placeholderTextColor="#8E8E93"
            style={[styles.searchInput, { color: Colors[colorScheme].text }]}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#8E8E93" />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={[
            styles.filterButton,
            filters.length > 0 && styles.activeFilterButton,
          ]}
          onPress={() => setIsFilterOpen(true)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={filters.length > 0 ? "#FFFFFF" : "#3B81F6"}
          />
          {filters.length > 0 ? (
            <View style={styles.filterCountBadge}>
              <ThemedText style={styles.filterCountText}>
                {filters.length}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickFiltersRow}
      >
        {(
          [
            ["all", t("allMessages")],
            ["favorite", t("favoriteMessages")],
            ["pinned", t("pinnedMessages")],
            ["important", t("importantMessages")],
          ] as const
        ).map(([value, label]) => {
          const active =
            value === "all"
              ? filters.length === 0
              : filters.length === 1 && filters.includes(value);
          return (
            <Pressable
              key={value}
              onPress={() => {
                if (value === "all") {
                  setFilters([]);
                  setPriorityFilter("any");
                  return;
                }
                if (value === "important") {
                  setPriorityFilter("any");
                }
                setFilters([value]);
              }}
              style={[styles.quickFilterChip, active && styles.activeQuickFilterChip]}
            >
              <ThemedText
                style={[
                  styles.quickFilterText,
                  colorScheme === "dark" && styles.quickFilterTextDark,
                  active && styles.activeQuickFilterText,
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  if (messages.length === 0) {
    const iconColor = colorScheme === "dark" ? "#FFFFFF" : "#3B81F6";

    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        {messageToolbar}
        <ScrollView
          contentContainerStyle={styles.noMessagesContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadMessages({ refresh: true })}
              tintColor={BrandColors[colorScheme]}
            />
          }
        >
          <View style={styles.noMessagesIllustration}>
            <Image
              source={require("@/assets/images/parentandchildren.png")}
              style={styles.illustrationImage}
            />
          </View>

          <ThemedText style={styles.emptyTitle}>
            {t("noMessagesYet")}
          </ThemedText>
          <ThemedText style={styles.emptyDescription}>
            {t("noMessagesDescription")}
          </ThemedText>

          <Pressable
            style={({ pressed }) => [
              styles.refreshButtonContainer,
              isRefreshing && styles.refreshButtonContainerLoading,
              {
                backgroundColor: isRefreshing
                  ? colorScheme === "dark"
                    ? "#2563EB"
                    : "rgba(59, 129, 246, 0.05)"
                  : colorScheme === "dark"
                    ? "#3B81F6"
                    : "#3B81F61A",
                opacity: pressed && !isRefreshing ? 0.7 : 1,
              },
            ]}
            android_ripple={{ color: "#3B81F633" }}
            disabled={isRefreshing}
            onPress={() => void loadMessages({ refresh: true })}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={iconColor} />
            ) : (
              <>
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={iconColor}
                  style={{ marginRight: 8 }}
                />
                <ThemedText
                  style={[styles.refreshButtonText, { color: iconColor }]}
                >
                  {t("refresh")}
                </ThemedText>
              </>
            )}
          </Pressable>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {messageToolbar}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              await loadMessages({ refresh: true });
              await refreshUnreadCount();
            }}
            tintColor={BrandColors[colorScheme]}
          />
        }
      >
        {displayMessages.map((message, index) => {
          const isRead = !!message.viewed_at;
          const messagePreview = getMessagePreview(message.content);
          const localDateTime = getMessageDateTime(message.sent_time);

          const isPinned = pinnedMessageIds.includes(message.id);
          const showPinnedHeading =
            filters.length === 0 && index === 0 && pinnedVisibleMessages.length > 0;
          const showAllHeading =
            filters.length === 0 &&
            index === pinnedVisibleMessages.length &&
            allVisibleMessages.length > 0;

          return (
            <Fragment key={message.id}>
              {showPinnedHeading ? (
                <View style={styles.messageSectionHeading}>
                  <Ionicons name="pin" size={18} color="#2563C5" />
                  <ThemedText style={styles.messageSectionHeadingText}>
                    {t("pinnedMessages")}
                  </ThemedText>
                </View>
              ) : null}
              {showAllHeading ? (
                <ThemedText style={styles.allMessagesHeading}>
                  {t("allMessages")}
                </ThemedText>
              ) : null}
              <Pressable
              key={message.id}
              onPress={() => handleOpenMessage(message)}
              onLongPress={() => setSelectedMessageId(message.id)}
              delayLongPress={350}
              style={[
                styles.card,
                pinnedMessageIds.includes(message.id) && styles.pinnedCard,
                {
                  backgroundColor: isPinned
                    ? colorScheme === "dark"
                      ? "#173B70"
                      : "#EAF2FF"
                    : colorScheme === "dark"
                      ? "#1C1C1E"
                      : "#FFFFFF",
                  borderColor: pinnedMessageIds.includes(message.id)
                    ? "#3B81F6"
                    : !isRead
                      ? BrandColors[colorScheme]
                      : colorScheme === "dark"
                        ? "#2C2C2E"
                        : "#E5E5EA",
                  borderWidth: !isRead ? 1.5 : 1,
                },
              ]}
            >
              <View style={styles.titleRow}>
                {isPinned ? (
                  <Ionicons
                    name="pin"
                    size={19}
                    color="#2563C5"
                    style={styles.pinnedTitleIcon}
                  />
                ) : null}
                <ThemedText
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.title, isRead && styles.readOpacity]}
                >
                  {message.title}
                </ThemedText>
                <View style={styles.headerRight}>
                  <ThemedText
                    style={getImportanceBadgeStyle(message.priority, isRead)}
                  >
                    {getImportanceLabel(message.priority, t)}
                  </ThemedText>
                  <Pressable
                    hitSlop={8}
                    onPress={(event) => {
                      event.stopPropagation();
                      handleToggleFavorite(message.id);
                    }}
                    style={styles.favoriteButton}
                  >
                    <Ionicons
                      name={
                        favoriteMessageIds.includes(message.id)
                          ? "star"
                          : "star-outline"
                      }
                      size={19}
                      color={
                        favoriteMessageIds.includes(message.id)
                          ? "#F59E0B"
                          : "#8E8E93"
                      }
                    />
                  </Pressable>
                </View>
              </View>

              {message.group_name ? (
                <View style={styles.groupRow}>
                  <ThemedText style={styles.groupBadge}>
                    {message.group_name}
                  </ThemedText>
                </View>
              ) : null}

              <ThemedText
                numberOfLines={2}
                ellipsizeMode="tail"
                style={[styles.preview, isRead && styles.readOpacity]}
              >
                {messagePreview}
              </ThemedText>

              <View style={styles.bottomRow}>
                <View style={styles.dateAndStatus}>
                  <ThemedText
                    style={[
                      styles.date,
                      {
                        color: colorScheme === "dark" ? "#8E8E93" : "#666666",
                      },
                      isRead && styles.readOpacity,
                    ]}
                  >
                    {localDateTime.toFormat("dd.MM.yyyy   HH:mm")}
                  </ThemedText>

                  <Ionicons
                    name={isRead ? "checkmark-done" : "checkmark"}
                    size={16}
                    color={colorScheme === "dark" ? "#0A84FF" : "#2089dc"}
                    style={{ opacity: isRead ? 1 : 0.8 }}
                  />
                </View>

                <Pressable
                  style={styles.readMoreButton}
                  onPress={() => handleOpenMessage(message)}
                >
                  <ThemedText
                    style={[
                      styles.readMoreText,
                      {
                        color: colorScheme === "dark" ? "#0A84FF" : "#2089dc",
                      },
                    ]}
                  >
                    {t("continueReading")}
                  </ThemedText>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colorScheme === "dark" ? "#0A84FF" : "#2089dc"}
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>
              </View>
              </Pressable>
            </Fragment>
          );
        })}

        {visibleMessages.length === 0 && messages.length > 0 ? (
          <View style={styles.emptySearchState}>
            <Ionicons name="search-outline" size={40} color="#8E8E93" />
            <ThemedText style={styles.emptySearchTitle}>
              {t("noMatchingMessages")}
            </ThemedText>
          </View>
        ) : null}

        {hasMore && (
          <Pressable
            style={[
              styles.loadMoreButton,
              isLoadingMore && styles.loadMoreButtonDisabled,
            ]}
            disabled={isLoadingMore}
            onPress={() => void loadMessages({ loadMore: true })}
          >
            {isLoadingMore ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.loadMoreText}>
                {t("loadMoreMessages")}
              </ThemedText>
            )}
          </Pressable>
        )}
      </ScrollView>
      <Modal
        visible={isFilterOpen}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <Pressable
          style={styles.actionSheetOverlay}
          onPress={() => setIsFilterOpen(false)}
        >
          <Pressable
            style={[
              styles.actionSheet,
              { backgroundColor: colorScheme === "dark" ? "#242426" : "#fff" },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.actionSheetHandle} />
            <ThemedText style={styles.actionSheetTitle}>
              {t("filterMessages")}
            </ThemedText>
            <ThemedText style={styles.filterGroupTitle}>
              {t("messageImportance")}
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChoiceRow}
            >
              {(
                [
                  ["any", t("anyImportance")],
                  ["high", t("critical")],
                  ["medium", t("important")],
                  ["low", t("ordinary")],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setPriorityFilter(value)}
                  style={[
                    styles.filterChoice,
                    priorityFilter === value && styles.activeFilterChoice,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.filterChoiceText,
                      priorityFilter === value && styles.activeFilterChoiceText,
                    ]}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <ThemedText style={styles.filterGroupTitle}>
              {t("messageStatus")}
            </ThemedText>
            {(
              [
                ["read", t("readMessages"), "mail-open-outline"],
                ["unread", t("unreadMessages"), "mail-unread-outline"],
                ["favorite", t("favoriteMessages"), "star-outline"],
                ["date", t("sortByDate"), "calendar-outline"],
              ] as const
            ).map(([value, label, icon]) => (
              <Pressable
                key={value}
                style={[
                  styles.filterOption,
                  filters.includes(value) && {
                    backgroundColor:
                      colorScheme === "dark" ? "#173B70" : "#EAF2FF",
                  },
                ]}
                onPress={() => {
                  setFilters((prev) =>
                    prev.includes(value)
                      ? prev.filter((item) => item !== value)
                      : [...prev, value],
                  );
                  if (value === "date" && filters.includes("date")) {
                    setSelectedDate(null);
                  }
                  if (value === "date") setCalendarMonth(DateTime.local().startOf("month"));
                }}
              >
                <Ionicons
                  name={icon}
                  size={22}
                  color={
                    filters.includes(value)
                      ? BrandColors[colorScheme]
                      : colorScheme === "dark"
                        ? "#FFFFFF"
                        : "#636366"
                  }
                />
                <ThemedText style={styles.filterOptionLabel}>
                  {label}
                </ThemedText>
                {filters.includes(value) ? (
                  <Ionicons
                    name="checkmark"
                    size={21}
                    color={BrandColors[colorScheme]}
                    style={styles.filterOptionCheck}
                  />
                ) : null}
              </Pressable>
            ))}
            {filters.includes("date") ? (
              <View style={styles.calendar}>
                <View style={styles.calendarHeader}>
                  <Pressable
                    onPress={() => setCalendarMonth((month) => month.minus({ months: 1 }))}
                    hitSlop={8}
                  >
                    <Ionicons name="chevron-back" size={21} color={BrandColors[colorScheme]} />
                  </Pressable>
                  <ThemedText style={styles.calendarTitle}>
                    {calendarMonth.toFormat("LLLL yyyy")}
                  </ThemedText>
                  <Pressable
                    onPress={() => setCalendarMonth((month) => month.plus({ months: 1 }))}
                    hitSlop={8}
                  >
                    <Ionicons name="chevron-forward" size={21} color={BrandColors[colorScheme]} />
                  </Pressable>
                </View>
                <View style={styles.calendarWeekRow}>
                  {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                    <ThemedText key={day} style={styles.calendarWeekDay}>
                      {day}
                    </ThemedText>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {Array.from(
                    { length: calendarMonth.weekday - 1 },
                    (_, index) => <View key={`empty-${index}`} style={styles.calendarDay} />,
                  )}
                  {Array.from({ length: calendarMonth.daysInMonth }, (_, index) => {
                    const day = index + 1;
                    const date = calendarMonth.set({ day }).toISODate();
                    const isSelected = date === selectedDate;
                    return (
                      <Pressable
                        key={date}
                        style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
                        onPress={() => {
                          setSelectedDate(date);
                        }}
                      >
                        <ThemedText
                          style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}
                        >
                          {day}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
            <View style={styles.filterActions}>
              <Pressable style={styles.resetFilterButton} onPress={resetFilters}>
                <ThemedText style={styles.resetFilterText}>
                  {t("resetFilters")}
                </ThemedText>
              </Pressable>
              <Pressable
                style={styles.applyFilterButton}
                onPress={() => setIsFilterOpen(false)}
              >
                <ThemedText style={styles.applyFilterText}>
                  {t("applyFilters")}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={selectedMessageId !== null}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setSelectedMessageId(null)}
      >
        <Pressable
          style={styles.actionSheetOverlay}
          onPress={() => setSelectedMessageId(null)}
        >
          {selectedMessage ? (
            <View
              style={[
                styles.selectedMessagePreview,
                {
                  backgroundColor:
                    colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF",
                },
              ]}
            >
              <View style={styles.titleRow}>
                <ThemedText numberOfLines={1} style={styles.title}>
                  {selectedMessage.title}
                </ThemedText>
                <ThemedText
                  style={getImportanceBadgeStyle(
                    selectedMessage.priority,
                    false,
                  )}
                >
                  {getImportanceLabel(selectedMessage.priority, t)}
                </ThemedText>
              </View>
              <ThemedText numberOfLines={2} style={styles.preview}>
                {getMessagePreview(selectedMessage.content)}
              </ThemedText>
            </View>
          ) : null}
          <Pressable
            style={[
              styles.actionSheet,
              { backgroundColor: colorScheme === "dark" ? "#242426" : "#fff" },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.actionSheetHandle} />
            <Pressable style={styles.actionRow} onPress={() => void handleCopyLink()}>
              <Ionicons name="link-outline" size={22} color={BrandColors[colorScheme]} />
              <ThemedText style={styles.actionLabel}>{t("copyLink")}</ThemedText>
            </Pressable>
            <Pressable style={styles.actionRow} onPress={handleTogglePin}>
              <Ionicons name="pin-outline" size={22} color={BrandColors[colorScheme]} />
              <ThemedText style={styles.actionLabel}>{t("pinMessage")}</ThemedText>
            </Pressable>
            <Pressable style={styles.actionRow} onPress={handleMarkUnread}>
              <Ionicons name="mail-unread-outline" size={22} color={BrandColors[colorScheme]} />
              <ThemedText style={styles.actionLabel}>{t("markUnread")}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  noMessagesContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 40,
    paddingTop: 56,
  },
  noMessagesIllustration: {
    marginBottom: 4,
    alignItems: "center",
    width: "100%",
  },
  illustrationImage: {
    width: "100%",
    height: 250,
    resizeMode: "contain",
  },
  content: {
    paddingBottom: 24,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
  },
  searchBox: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 16,
  },
  filterButton: {
    width: 48,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderColor: "#3B81F6",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  activeFilterButton: {
    backgroundColor: "#3B81F6",
    borderColor: "#3B81F6",
  },
  filterButtonText: {
    fontSize: 13,
    color: "#2563C5",
    fontWeight: "600",
  },
  filterCountBadge: {
    position: "absolute",
    top: -5,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563C5",
  },
  filterCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  quickFiltersRow: {
    gap: 8,
    paddingRight: 16,
  },
  quickFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  activeQuickFilterChip: {
    backgroundColor: "#2F5BD3",
    borderColor: "#2F5BD3",
  },
  quickFilterText: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "600",
  },
  quickFilterTextDark: {
    color: "#F3F4F6",
  },
  activeQuickFilterText: {
    color: "#FFFFFF",
  },
  messageSectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  messageSectionHeadingText: {
    color: "#2563C5",
    fontSize: 18,
    fontWeight: "700",
  },
  allMessagesHeading: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
    color: "#5B6575",
    fontSize: 18,
    fontWeight: "700",
  },
  pinnedTitleIcon: {
    marginRight: 8,
  },
  selectedFiltersRow: {
    gap: 8,
    alignItems: "center",
    paddingRight: 8,
  },
  selectedFiltersScroll: {
    flex: 1,
  },
  selectedFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF2FF",
    borderRadius: 16,
    paddingLeft: 11,
    paddingRight: 7,
    paddingVertical: 7,
  },
  selectedFilterText: {
    color: "#2563C5",
    fontSize: 13,
    fontWeight: "600",
  },
  activeFilterChipText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  pinnedCard: {
    borderColor: "#3B81F6",
  },
  favoriteButton: {
    marginRight: 8,
  },
  emptySearchState: {
    alignItems: "center",
    paddingTop: 70,
    gap: 12,
  },
  emptySearchTitle: {
    fontSize: 16,
    opacity: 0.65,
  },
  actionSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  actionSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  actionSheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C7C7CC",
    marginBottom: 18,
  },
  actionSheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  selectedMessagePreview: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 245,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    gap: 14,
  },
  filterOption: {
    minHeight: 54,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
  },
  filterOptionLabel: {
    fontSize: 16,
  },
  filterOptionCheck: {
    marginLeft: "auto",
  },
  filterGroupTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    opacity: 0.7,
  },
  filterChoiceRow: {
    gap: 8,
    paddingBottom: 6,
  },
  filterChoice: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  activeFilterChoice: {
    backgroundColor: "#2F5BD3",
    borderColor: "#2F5BD3",
  },
  filterChoiceText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeFilterChoiceText: {
    color: "#FFFFFF",
  },
  filterActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  resetFilterButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resetFilterText: {
    fontSize: 15,
    fontWeight: "600",
  },
  applyFilterButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#2F5BD3",
    alignItems: "center",
    justifyContent: "center",
  },
  applyFilterText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  calendar: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#D1D1D6",
    paddingTop: 12,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  calendarWeekDay: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 12,
    opacity: 0.55,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
  },
  calendarDaySelected: {
    backgroundColor: BrandColors.light,
  },
  calendarDayText: {
    fontSize: 14,
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  actionLabel: {
    fontSize: 16,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 9,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.7,
    marginBottom: 40,
  },
  retryButton: {
    backgroundColor: "#005678",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  refreshButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 47.67,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshButtonContainerLoading: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    width: 68,
    height: 48,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  card: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
    zIndex: 1,
    position: "relative",
    marginHorizontal: 15,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.09,
    shadowRadius: 1,
    elevation: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
    marginRight: 15,
    width: "100%",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 20,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 10,
  },
  groupBadge: {
    backgroundColor: colors.success,
    color: "white",
    padding: 5,
    borderRadius: 5,
    fontSize: 12,
    overflow: "hidden",
  },
  preview: {
    fontSize: 16,
    lineHeight: 21,
    marginTop: 5,
  },
  date: {
    fontSize: 12,
    fontWeight: "300",
  },
  readOpacity: {
    opacity: 0.6,
  },
  dateAndStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
    flexWrap: "wrap",
  },
  readMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
  },
  readMoreText: {
    fontWeight: "600",
    fontSize: 33 / 2,
  },
  loadMoreButton: {
    marginTop: 10,
    marginHorizontal: 15,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#005678",
  },
  loadMoreButtonDisabled: {
    opacity: 0.8,
  },
  loadMoreText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
