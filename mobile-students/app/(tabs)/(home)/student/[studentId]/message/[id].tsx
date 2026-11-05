import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PollView, { Poll, PollOption } from "@/components/PollView";
import {
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { DateTime } from "luxon";

import ZoomGallery from "@/components/ZoomGallery";
import MessageDescription from "@/components/MessageDescription";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { I18nContext } from "@/contexts/i18n-context";
import {
  fetchStudentMessage,
  voteStudentPoll,
  removeStudentPollVote,
} from "@/services/student-messages";
import type { Message } from "@/types/message";
import { useFontSize } from "@/contexts/font-size-context";
import { getMessageImageUrls } from "@/utils/image-url";

export type TranslationKeys = {
  critical: string;
  important: string;
  ordinary: string;
  loading: string;
  failedToRetrieveMessage: string;
  tryAgain: string;
  copy: string;
  messageCopiedToClipboard: string;
};

function showCopiedToast(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert(message);
}

function getPriorityBadgeColor(priority: Message["priority"]) {
  if (priority === "high") {
    return "#FF2B2B";
  }

  if (priority === "medium") {
    return "#F59E0B";
  }

  return "#16A34A";
}

export default function MessageDetailScreen() {
  const colorScheme = useColorScheme() ?? "dark";
  const isDark = colorScheme === "dark";
  const pageBackgroundColor = isDark ? "#111215" : "#fff";
  const { t, language } = useContext(I18nContext);
  const { multiplier } = useFontSize();

  const { id } = useLocalSearchParams<{
    id?: string | string[];
    studentId?: string | string[];
  }>();

  const messageId = Array.isArray(id) ? id[0] : id;

  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [inlineZoomImages, setInlineZoomImages] = useState<string[] | null>(null);
  const [inlineZoomIndex, setInlineZoomIndex] = useState(0);
  const [imageAspectRatios, setImageAspectRatios] = useState<
    Record<string, number>
  >({});

  const screenWidth = Dimensions.get("window").width;
  const imageContainerWidth = screenWidth - 32; // scrollContent paddingHorizontal: 16 * 2

  const [userPollVotes, setUserPollVotes] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!messageId) return;
    AsyncStorage.getItem(`@student_poll_votes_${messageId}`)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === "object") {
              setUserPollVotes((prev) => ({ ...parsed, ...prev }));
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, [messageId]);

  const handleImageLoad = useCallback(
    (uri: string, width: number, height: number) => {
      setImageAspectRatios((prev) =>
        prev[uri] ? prev : { ...prev, [uri]: width / height },
      );
    },
    [],
  );

  const loadMessage = useCallback(async () => {
    if (!messageId) {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      const post = await fetchStudentMessage(messageId);
      setMessage(post);
      if (Array.isArray(post.polls) && post.polls.length > 0) {
        setUserPollVotes((prev) => {
          const next = { ...prev };
          post.polls?.forEach((p) => {
            if (p.id && p.my_option_id) {
              next[p.id] = p.my_option_id;
            }
          });
          return next;
        });
      } else if (post.poll?.id && post.poll.my_option_id) {
        setUserPollVotes((prev) => ({
          ...prev,
          [post.poll!.id]: post.poll!.my_option_id!,
        }));
      }
    } catch (error) {
      console.error("Error loading student message:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [messageId]);

  useFocusEffect(
    useCallback(() => {
      void loadMessage();
    }, [loadMessage]),
  );

  const imageUrls = useMemo(
    () => getMessageImageUrls(message?.images ?? message?.image ?? null),
    [message],
  );

  const imagesForZoomGallery = useMemo(
    () => imageUrls.map((uri) => ({ uri })),
    [imageUrls],
  );
  const zoomGalleryImages = useMemo(() => {
    if (inlineZoomImages && inlineZoomImages.length > 0) {
      return inlineZoomImages.map((uri) => ({ uri }));
    }
    return imagesForZoomGallery;
  }, [inlineZoomImages, imagesForZoomGallery]);

  const fallbackPollQuestions = useMemo(() => {
    if (!message?.content) return [];
    const questions: string[] = [];
    const regex = /data-poll-question=["']([^"']*)["']/gi;
    let match;
    while ((match = regex.exec(message.content)) !== null) {
      questions.push(match[1]);
    }
    return questions;
  }, [message?.content]);

  const pollsToRender = useMemo(() => {
    const enrichPoll = (p: Poll, pIdx: number): Poll => {
      let myOptionId =
        userPollVotes[p.id] ??
        userPollVotes[pIdx] ??
        p.my_option_id ??
        null;

      if (myOptionId === null && message?.poll?.my_option_id) {
        const hasOpt = p.options.some((o) => o.id === message.poll?.my_option_id);
        if (hasOpt) {
          myOptionId = message.poll.my_option_id;
        }
      }

      const isVoted = myOptionId !== null;
      let total = p.options.reduce(
        (sum, o) => sum + (typeof o.votes === "number" ? o.votes : 0),
        0
      );
      if (isVoted && total === 0) {
        total = 1;
      }

      const options = p.options.map((opt) => {
        const isThisSelected = opt.id === myOptionId;
        const votes =
          typeof opt.votes === "number"
            ? opt.votes
            : isThisSelected
            ? 1
            : isVoted
            ? 0
            : null;
        const percent =
          isVoted && total > 0 && typeof votes === "number"
            ? Math.round((votes / total) * 1000) / 10
            : opt.percent;
        return {
          ...opt,
          votes,
          percent,
        };
      });

      return {
        ...p,
        options,
        my_option_id: myOptionId,
        total_votes: isVoted ? total : p.total_votes,
        results_visible: isVoted || p.results_visible,
      };
    };

    // 1. Agar backend allaqachon bir nechta poll qaytargan bo'lsa
    if (Array.isArray(message?.polls) && message.polls.length > 1) {
      return message.polls.map(enrichPoll);
    }

    // 2. Agar content ichida bir nechta poll bo'lsa, ularni ajratib backend options bilan moslashtirish
    if (message?.content && message.content.includes("data-poll")) {
      const rawPolls: Array<{ question: string; optionTexts: string[] }> = [];
      const regex = /<div\b[^>]*\bdata-poll=["']true["'][^>]*>/gi;
      let match;
      while ((match = regex.exec(message.content)) !== null) {
        const tag = match[0];
        const optionsMatch = tag.match(/data-poll-options=["']([^"']+)["']/i);
        if (!optionsMatch) continue;
        try {
          const raw = optionsMatch[1]
            .replace(/&quot;/g, '"')
            .replace(/&#34;/g, '"');
          const options = JSON.parse(raw);
          if (Array.isArray(options) && options.length >= 2) {
            const questionMatch = tag.match(
              /data-poll-question=["']([^"']*)["']/i
            );
            const question = questionMatch ? questionMatch[1] : "";
            rawPolls.push({ question, optionTexts: options });
          }
        } catch {}
      }

      if (rawPolls.length > 1) {
        const backendOptions: PollOption[] = message?.poll?.options ?? [];
        let backendOptionIdx = 0;

        return rawPolls.map((rp, pIdx) => {
          const pollOptions: PollOption[] = [];
          for (let i = 0; i < rp.optionTexts.length; i++) {
            const text = rp.optionTexts[i];
            const matchedByText = backendOptions.find(
              (bo) => bo.text.trim().toLowerCase() === text.trim().toLowerCase()
            );
            const matchedByIndex = backendOptions[backendOptionIdx];
            const matched = matchedByText ?? matchedByIndex;
            backendOptionIdx++;

            pollOptions.push({
              id: matched ? matched.id : pIdx * 100 + i + 1,
              text,
              votes: matched?.votes ?? null,
              percent: matched?.percent ?? null,
            });
          }

          const basePoll: Poll = {
            id: message?.poll?.id ? message.poll.id + pIdx : pIdx + 1,
            question: rp.question || null,
            options: pollOptions,
            my_option_id: null,
            total_votes: null,
            results_visible: false,
          };

          return enrichPoll(basePoll, pIdx);
        });
      }
    }

    // 3. Standart holat
    if (Array.isArray(message?.polls) && message.polls.length > 0) {
      return message.polls.map(enrichPoll);
    }
    if (message?.poll) {
      return [enrichPoll(message.poll, 0)];
    }
    return [];
  }, [message?.poll, message?.polls, message?.content, userPollVotes]);

  const getPriorityLabel = (priority: Message["priority"]) => {
    if (priority === "high") return t("critical");
    if (priority === "medium") return t("important");
    return t("ordinary");
  };

  const handleVote = async (pollId: number, optionId: number) => {
    if (!message?.post_id) return;

    setUserPollVotes((prev) => {
      const next = { ...prev, [pollId]: optionId };
      if (messageId) {
        AsyncStorage.setItem(
          `@student_poll_votes_${messageId}`,
          JSON.stringify(next)
        ).catch(() => {});
      }
      return next;
    });

    try {
      const result = await voteStudentPoll(message.post_id, optionId);
      if (result) {
        setMessage((prev) => {
          if (!prev) return prev;
          const returnedPolls =
            'polls' in result && Array.isArray(result.polls)
              ? result.polls
              : undefined;
          const returnedPoll =
            'poll' in result ? result.poll : (result as Poll);

          let updatedPolls = prev.polls;
          if (returnedPolls) {
            updatedPolls = returnedPolls;
          } else if (returnedPoll && Array.isArray(prev.polls)) {
            updatedPolls = prev.polls.map((p) =>
              p.id === returnedPoll.id ? returnedPoll : p
            );
          }

          return {
            ...prev,
            polls: updatedPolls,
          };
        });
      }
    } catch (e) {
      console.error("Error voting:", e);
    }
  };

  const handleRemoveVote = async (pollId: number) => {
    if (!message?.post_id) return;

    setUserPollVotes((prev) => {
      const next = { ...prev };
      delete next[pollId];
      if (messageId) {
        AsyncStorage.setItem(
          `@student_poll_votes_${messageId}`,
          JSON.stringify(next)
        ).catch(() => {});
      }
      return next;
    });

    try {
      const result = await removeStudentPollVote(message.post_id, pollId);
      if (result) {
        setMessage((prev) => {
          if (!prev) return prev;
          const returnedPolls =
            'polls' in result && Array.isArray(result.polls)
              ? result.polls
              : undefined;
          return {
            ...prev,
            polls: returnedPolls ?? prev.polls,
          };
        });
      }
    } catch (e) {
      console.error("Error removing vote:", e);
    }
  };

  const handleCopy = async () => {
    if (!message?.content) {
      return;
    }

    // Strip HTML tags to copy only the text content (no images)
    const plainText = message.content
      .replace(/<img\b[^>]*>/gi, '')           // Remove img tags
      .replace(/<br\s*\/?>/gi, '\n')            // Convert <br> to newline
      .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n') // Block-level closing tags to newline
      .replace(/<[^>]+>/g, '')                  // Remove all remaining HTML tags
      .replace(/&nbsp;/g, ' ')                  // Decode common entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')              // Collapse excessive newlines
      .trim();

    if (!plainText) return;

    await Clipboard.setStringAsync(plainText);

    // Assert the type to bypass the error
    showCopiedToast(t("messageCopiedToClipboard" as keyof typeof t | any));
  };

  if (isLoading) {
    return (
      <ThemedView
        style={[
          styles.centeredContainer,
          { backgroundColor: pageBackgroundColor },
        ]}
      >
        <ActivityIndicator size="large" color="#0A84FF" />
        <ThemedText style={styles.loadingText}>{t("loading")}</ThemedText>
      </ThemedView>
    );
  }

  if (isError || !message) {
    return (
      <ThemedView
        style={[
          styles.centeredContainer,
          { backgroundColor: pageBackgroundColor },
        ]}
      >
        <ThemedText style={styles.errorText}>
          {t("failedToRetrieveMessage")}
        </ThemedText>
        <Pressable
          style={styles.retryButton}
          onPress={() => void loadMessage()}
        >
          <ThemedText style={styles.retryButtonText}>
            {t("tryAgain")}
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const sentTimeString = message.sent_time;
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Handle both ISO format (demo data) and database format (regular data)
  let utcDateTime;
  if (sentTimeString.includes("T")) {
    // ISO format: 2025-08-30T10:30:00Z
    utcDateTime = DateTime.fromISO(sentTimeString, { zone: "utc" });
  } else {
    // Database format: 2025-08-30 10:30
    utcDateTime = DateTime.fromFormat(sentTimeString, "yyyy-MM-dd HH:mm", {
      zone: "utc",
    });
  }

  const localDateTime = utcDateTime.setZone(userTimeZone);
  const formattedTime = localDateTime.toFormat("dd.MM.yyyy   HH:mm");

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: pageBackgroundColor }]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: pageBackgroundColor }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: pageBackgroundColor }]}>
          <View
            style={[
              styles.titleRow,
              multiplier > 1
                ? { flexDirection: "column-reverse", alignItems: "flex-start" }
                : {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
            ]}
          >
            <ThemedText
              style={[
                styles.title,
                {
                  color: isDark ? "#FFFFFF" : "#111827",
                  textAlign: "left",
                  flex: multiplier > 1 ? 0 : 1,
                  flexShrink: multiplier > 1 ? 0 : 1,
                  width: multiplier > 1 ? "100%" : "auto",
                },
              ]}
            >
              {message.title}
            </ThemedText>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: getPriorityBadgeColor(message.priority),
                  borderRadius: 4,
                  paddingHorizontal: 6 * multiplier,
                  paddingVertical: 4 * multiplier,
                  justifyContent: "center",
                  alignItems: "center",
                  marginLeft: multiplier > 1 ? 0 : 10,
                  alignSelf: multiplier > 1 ? "flex-end" : "center",
                },
              ]}
            >
              <ThemedText
                style={{
                  color: "#FFFFFF",
                  fontSize: 11,
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                {getPriorityLabel(message.priority)}
              </ThemedText>
            </View>
          </View>

          {imageUrls.length > 0 && (
            <View style={styles.imageContainer}>
              {imageUrls.map((uri, index) => {
                const aspectRatio = imageAspectRatios[uri];
                const computedHeight = aspectRatio
                  ? imageContainerWidth / aspectRatio
                  : 260;

                return (
                  <View key={`${uri}-${index}`} style={styles.imageItem}>
                    <TouchableOpacity
                      onPress={() => {
                        setInlineZoomImages(null);
                        setInlineZoomIndex(0);
                        setCurrentImageIndex(index);
                        setZoomVisible(true);
                      }}
                    >
                      <View style={styles.imageWrapper}>
                        <Image
                          style={[styles.image, { height: computedHeight }]}
                          source={{ uri }}
                          resizeMode="contain"
                          onLoad={(e) => {
                            const { width, height } = e.nativeEvent.source;
                            handleImageLoad(uri, width, height);
                          }}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.preview}>
            <MessageDescription
              content={message.content}
              textColor={isDark ? "#E5E7EB" : "#1F2937"}
              fontSize={16 * multiplier}
              onImagePress={(images, index) => {
                setInlineZoomImages(images);
                setInlineZoomIndex(index);
                setZoomVisible(true);
              }}
            />
          </View>

          {pollsToRender.map((p, idx) => (
            <PollView
              key={p.id || idx}
              poll={p}
              language={language}
              isDark={isDark}
              textColor={isDark ? "#E5E7EB" : "#1F2937"}
              onVote={(optionId) => handleVote(p.id, optionId)}
              onRemoveVote={() => handleRemoveVote(p.id)}
              fallbackQuestion={fallbackPollQuestions[idx] || null}
            />
          ))}

          <View style={styles.footerRow}>
            <ThemedText
              style={[styles.date, { color: isDark ? "#6B7280" : "#6B7280" }]}
            >
              {formattedTime}
            </ThemedText>

            <Pressable onPress={handleCopy} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={20} color="#0A84FF" />
              <ThemedText style={styles.copyText}>Copy</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <ZoomGallery
        visible={zoomVisible}
        images={zoomGalleryImages}
        initialIndex={inlineZoomImages ? inlineZoomIndex : currentImageIndex}
        onRequestClose={() => {
          setZoomVisible(false);
          setInlineZoomImages(null);
          setInlineZoomIndex(0);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
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
  card: {
    borderRadius: 8,
    padding: 0,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    flexShrink: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "lowercase",
  },
  imageContainer: {
    marginTop: 12,
  },
  imageItem: {
    marginBottom: 10,
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
  },
  preview: {
    marginTop: 8,
  },
  footerRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 14,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  copyText: {
    color: "#0A84FF",
    fontSize: 14,
    fontWeight: "500",
  },
});
