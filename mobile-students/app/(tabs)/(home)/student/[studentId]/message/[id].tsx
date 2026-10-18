import { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
import { fetchStudentMessage } from "@/services/student-messages";
import type { Message } from "@/types/message";
import { useFontSize } from "@/contexts/font-size-context";
import { getMessageImageUrls } from "@/utils/image-url";
import { downloadFileFromUrl, getDownloadFileName } from "@/utils/file-download";

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

  const [activeTab, setActiveTab] = useState<"message" | "files">("message");
  const [downloadingUri, setDownloadingUri] = useState<string | null>(null);

  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [inlineZoomGroup, setInlineZoomGroup] = useState<{
    images: string[];
    index: number;
  } | null>(null);

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
  const zoomGalleryImages = inlineZoomGroup
    ? inlineZoomGroup.images.map((uri) => ({ uri }))
    : imagesForZoomGallery;

  const getPriorityLabel = (priority: Message["priority"]) => {
    if (priority === "high") return t("critical");
    if (priority === "medium") return t("important");
    return t("ordinary");
  };

  const handleCopy = async () => {
    if (!message?.content) {
      return;
    }

    await Clipboard.setStringAsync(message.content);

    // Assert the type to bypass the error
    showCopiedToast(t("messageCopiedToClipboard" as keyof typeof t | any));
  };

  const handleDownloadFile = async (uri: string) => {
    try {
      setDownloadingUri(uri);
      await downloadFileFromUrl(uri, t);
    } finally {
      setDownloadingUri(null);
    }
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
        {/* Top Segment Tabs: Message | Files */}
        <View
          style={[
            styles.tabBar,
            { backgroundColor: isDark ? "#1C1D22" : "#F3F4F6" },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab("message")}
            style={[
              styles.tabButton,
              activeTab === "message" && [
                styles.activeTabButton,
                { backgroundColor: isDark ? "#2A2B32" : "#FFFFFF" },
              ],
            ]}
          >
            <Ionicons
              name="chatbox-outline"
              size={18}
              color={
                activeTab === "message"
                  ? "#0A84FF"
                  : isDark
                    ? "#9CA3AF"
                    : "#6B7280"
              }
            />
            <ThemedText
              style={[
                styles.tabButtonText,
                { fontSize: 15 * multiplier },
                activeTab === "message"
                  ? [styles.activeTabText, { color: isDark ? "#FFFFFF" : "#111827" }]
                  : { color: isDark ? "#9CA3AF" : "#6B7280" },
              ]}
            >
              {t("messageTab")}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab("files")}
            style={[
              styles.tabButton,
              activeTab === "files" && [
                styles.activeTabButton,
                { backgroundColor: isDark ? "#2A2B32" : "#FFFFFF" },
              ],
            ]}
          >
            <Ionicons
              name="attach-outline"
              size={18}
              color={
                activeTab === "files"
                  ? "#0A84FF"
                  : isDark
                    ? "#9CA3AF"
                    : "#6B7280"
              }
            />
            <ThemedText
              style={[
                styles.tabButtonText,
                { fontSize: 15 * multiplier },
                activeTab === "files"
                  ? [styles.activeTabText, { color: isDark ? "#FFFFFF" : "#111827" }]
                  : { color: isDark ? "#9CA3AF" : "#6B7280" },
              ]}
            >
              {t("filesTab")}
            </ThemedText>
            {imageUrls.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === "files"
                        ? "#0A84FF"
                        : isDark
                          ? "#374151"
                          : "#E5E7EB",
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.tabBadgeText,
                    {
                      color:
                        activeTab === "files"
                          ? "#FFFFFF"
                          : isDark
                            ? "#D1D5DB"
                            : "#4B5563",
                    },
                  ]}
                >
                  {imageUrls.length}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab 1: Message Content */}
        {activeTab === "message" ? (
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

            <View style={styles.preview}>
              <MessageDescription
                content={message.content}
                textColor={isDark ? "#E5E7EB" : "#1F2937"}
                fontSize={16 * multiplier}
                onImagePress={(uri, groupImages, groupIndex) => {
                  const group =
                    groupImages && groupImages.length > 0 ? groupImages : [uri];
                  const idx = groupIndex !== undefined ? groupIndex : 0;
                  setInlineZoomGroup({ images: group, index: idx });
                  setCurrentImageIndex(idx);
                  setZoomVisible(true);
                }}
              />

              {imageUrls.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveTab("files")}
                  style={[
                    styles.goToFilesBanner,
                    {
                      backgroundColor: isDark ? "#1C1D22" : "#F3F4F6",
                      borderColor: isDark ? "#2A2B32" : "#E5E7EB",
                    },
                  ]}
                >
                  <View style={styles.goToFilesLeft}>
                    <Ionicons name="attach-outline" size={18} color="#0A84FF" />
                    <ThemedText
                      style={[
                        styles.goToFilesText,
                        { color: isDark ? "#E5E7EB" : "#1F2937" },
                      ]}
                    >
                      {t("imagesAttached", { count: imageUrls.length })}
                    </ThemedText>
                  </View>
                  <View style={styles.goToFilesRight}>
                    <ThemedText style={styles.goToFilesActionText}>
                      {t("filesTab") || "Fayllar"}
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={16} color="#0A84FF" />
                  </View>
                </TouchableOpacity>
              )}
            </View>

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
        ) : (
          /* Tab 2: Files View (No carousel, individual clean cards with preview & direct download) */
          <View style={styles.filesContainer}>
            {imageUrls.length === 0 ? (
              <View style={styles.emptyFilesContainer}>
                <Ionicons
                  name="folder-open-outline"
                  size={54}
                  color={isDark ? "#4B5563" : "#9CA3AF"}
                />
                <ThemedText
                  style={[
                    styles.emptyFilesTitle,
                    {
                      color: isDark ? "#FFFFFF" : "#111827",
                      fontSize: 16 * multiplier,
                    },
                  ]}
                >
                  {t("noAttachedFiles")}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.emptyFilesDesc,
                    {
                      color: isDark ? "#9CA3AF" : "#6B7280",
                      fontSize: 14 * multiplier,
                    },
                  ]}
                >
                  {t("noAttachedFilesDescription")}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.filesList}>
                {imageUrls.map((uri, index) => {
                  const rawFilename = getDownloadFileName(uri);
                  const isThisDownloading = downloadingUri === uri;

                  return (
                    <TouchableOpacity
                      key={`${uri}-${index}`}
                      activeOpacity={0.8}
                      onPress={() => {
                        setInlineZoomGroup({ images: [uri], index: 0 });
                        setCurrentImageIndex(0);
                        setZoomVisible(true);
                      }}
                      style={[
                        styles.fileCard,
                        {
                          backgroundColor: isDark ? "#1C1D22" : "#F9FAFB",
                          borderColor: isDark ? "#2A2B32" : "#E5E7EB",
                        },
                      ]}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.fileThumbnail}
                        resizeMode="cover"
                      />

                      <View style={styles.fileInfo}>
                        <ThemedText
                          numberOfLines={1}
                          style={[
                            styles.fileName,
                            {
                              color: isDark ? "#FFFFFF" : "#111827",
                              fontSize: 14 * multiplier,
                            },
                          ]}
                        >
                          {rawFilename}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.fileMeta,
                            {
                              color: isDark ? "#9CA3AF" : "#6B7280",
                              fontSize: 12 * multiplier,
                            },
                          ]}
                        >
                          {index + 1} / {imageUrls.length}
                        </ThemedText>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => void handleDownloadFile(uri)}
                        disabled={isThisDownloading}
                        style={[
                          styles.fileDownloadButton,
                          {
                            backgroundColor: isDark ? "#2A2B32" : "#E5E7EB",
                          },
                        ]}
                      >
                        {isThisDownloading ? (
                          <ActivityIndicator size="small" color="#0A84FF" />
                        ) : (
                          <Ionicons
                            name="download-outline"
                            size={20}
                            color={isDark ? "#FFFFFF" : "#111827"}
                          />
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Full screen vertical scroll ZoomGallery */}
      <ZoomGallery
        visible={zoomVisible}
        images={zoomGalleryImages}
        initialIndex={
          inlineZoomGroup ? inlineZoomGroup.index : currentImageIndex
        }
        onRequestClose={() => {
          setZoomVisible(false);
          setInlineZoomGroup(null);
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
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  activeTabButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontWeight: "500",
  },
  activeTabText: {
    fontWeight: "600",
  },
  tabBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 2,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
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
  // Files tab styles
  filesContainer: {
    paddingVertical: 4,
  },
  filesList: {
    gap: 12,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  fileThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#2A2B32",
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  fileName: {
    fontWeight: "600",
  },
  fileMeta: {
    marginTop: 3,
  },
  fileDownloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  emptyFilesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyFilesTitle: {
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  emptyFilesDesc: {
    textAlign: "center",
    maxWidth: 260,
  },
  goToFilesBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
  },
  goToFilesLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  goToFilesText: {
    fontSize: 14,
    fontWeight: "500",
  },
  goToFilesRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  goToFilesActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0A84FF",
  },
});
