import { useCallback, useContext, useMemo, useState } from "react";
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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { DateTime } from 'luxon';

import ZoomGallery from '@/components/ZoomGallery';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { I18nContext } from '@/contexts/i18n-context';
import { fetchStudentMessage } from '@/services/student-messages';
import type { Message } from '@/types/message';
import { useFontSize } from '@/contexts/font-size-context';
import { getMessageImageUrls } from '@/utils/image-url';

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
  const { t } = useContext(I18nContext);
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
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});

  const screenWidth = Dimensions.get('window').width;
  const imageContainerWidth = screenWidth - 32; // scrollContent paddingHorizontal: 16 * 2

  const handleImageLoad = useCallback((uri: string, width: number, height: number) => {
    setImageAspectRatios((prev) =>
      prev[uri] ? prev : { ...prev, [uri]: width / height }
    );
  }, []);

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

  const getPriorityLabel = (priority: Message['priority']) => {
    if (priority === 'high') return t('critical');
    if (priority === 'medium') return t('important');
    return t('ordinary');
  };

  const handleCopy = async () => {
    if (!message?.content) {
      return;
    }

    await Clipboard.setStringAsync(message.content);

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
  if (sentTimeString.includes('T')) {
    // ISO format: 2025-08-30T10:30:00Z
    utcDateTime = DateTime.fromISO(sentTimeString, { zone: 'utc' });
  } else {
    // Database format: 2025-08-30 10:30
    utcDateTime = DateTime.fromFormat(sentTimeString, 'yyyy-MM-dd HH:mm', {
      zone: 'utc',
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
                ? { flexDirection: 'column-reverse', alignItems: 'flex-start' }
                : {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
            ]}
          >
            <ThemedText
              style={[
                styles.title,
                {
                  color: isDark ? '#FFFFFF' : '#111827',
                  textAlign: 'left',
                  flex: multiplier > 1 ? 0 : 1,
                  flexShrink: multiplier > 1 ? 0 : 1,
                  width: multiplier > 1 ? '100%' : 'auto',
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
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: multiplier > 1 ? 0 : 10,
                  alignSelf: multiplier > 1 ? 'flex-end' : 'center',
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

          <ThemedText
            style={[styles.preview, { color: isDark ? "#E5E7EB" : "#1F2937" }]}
          >
            {message.content}
          </ThemedText>

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
        images={imagesForZoomGallery}
        initialIndex={currentImageIndex}
        onRequestClose={() => setZoomVisible(false)}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
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
    overflow: 'hidden',
  },
  image: {
    width: '100%',
  },
  preview: {
    marginTop: 8,
    fontSize: 16,
  },
  footerRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '500',
  },
});
