import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DateTime } from 'luxon';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BrandColors, Colors, colors } from '@/constants/theme';
import { I18nContext } from '@/contexts/i18n-context';
import { useMessageContext } from '@/contexts/message-context';
import { fetchStudentMessages, fetchStudentUnreadCount } from '@/services/student-messages';
import type { Message } from '@/types/message';

const PAGE_SIZE = 5;

function mergeIncomingMessages(prev: Message[], incoming: Message[]): Message[] {
  if (prev.length === 0) {
    return incoming;
  }

  const prevIds = new Set(prev.map(message => message.id));
  const incomingById = new Map(incoming.map(message => [message.id, message]));

  const newMessages = incoming.filter(message => !prevIds.has(message.id));
  const updatedPrev = prev.map(message => incomingById.get(message.id) ?? message);

  return [...newMessages, ...updatedPrev];
}

function getImportanceLabel(
  priority: Message['priority'],
  t: (k: any) => string
) {
  if (priority === 'high') return t('critical');
  if (priority === 'medium') return t('important');
  return t('ordinary');
}

function getImportanceBadgeStyle(
  priority: Message['priority'],
  isRead: boolean
) {
  const baseStyle = {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    color: 'white',
    fontSize: 12,
    textAlign: 'center' as const,
    opacity: isRead ? 0.6 : 1,
  };

  switch (priority) {
    case 'high':
      return { ...baseStyle, backgroundColor: 'red' };
    case 'medium':
      return { ...baseStyle, backgroundColor: 'orange' };
    case 'low':
      return { ...baseStyle, backgroundColor: 'green' };
    default:
      return baseStyle;
  }
}

export default function StudentMessagesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = Colors[colorScheme].background;
  const { t } = useContext(I18nContext);
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

  const { setUnreadCount, refreshVersion } = useMessageContext();

  const readButNotSentMessageIDs = useRef<number[]>([]);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const lastHandledRefreshVersion = useRef(refreshVersion);

  messagesRef.current = messages;

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
      console.error('Error fetching unread count:', error);
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

        setMessages(prev => {
          if (loadMore) {
            const existingIds = new Set(prev.map(message => message.id));
            const nextMessages = fetched.filter(
              message => !existingIds.has(message.id)
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
        console.error('Error loading student messages:', error);
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
    []
  );

  const syncInbox = useCallback(
  async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent && isFetchingRef.current) {
      return;
    }
    await loadMessages({ refresh: true, silent });
    await refreshUnreadCount();
  },
    [loadMessages, refreshUnreadCount]
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
    }, [loadMessages, refreshUnreadCount])
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
        'hardwareBackPress',
        onBackPress
      );

      return () => {
        backHandler.remove();
      };
    }, [])
  );

  const handleOpenMessage = (message: Message) => {
    if (!message.viewed_at) {
      readButNotSentMessageIDs.current = Array.from(
        new Set([...readButNotSentMessageIDs.current, message.id])
      );

      setMessages(prev =>
        prev.map(item =>
          item.id === message.id
            ? { ...item, viewed_at: item.viewed_at ?? message.sent_time }
            : item
        )
      );

      // Optimistically decrement unread count
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    }

    router.push({
      pathname: '/(tabs)/(home)/student/[studentId]/message/[id]',
      params: {
        studentId: studentId ?? '',
        id: String(message.id),
      },
    });
  };

  if (isLoading && messages.length === 0) {
    return (
      <ThemedView style={[styles.centeredContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={BrandColors[colorScheme]} />
        <ThemedText style={styles.loadingText}>{t('loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (isError && messages.length === 0) {
    return (
      <ThemedView style={[styles.centeredContainer, { backgroundColor }]}>
        <ThemedText style={styles.errorText}>
          {t('errorLoadingMessages')}
        </ThemedText>
        <Pressable
          style={styles.retryButton}
          onPress={() => void loadMessages({ refresh: true })}
        >
          <ThemedText style={styles.retryButtonText}>{t('tryAgain')}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (messages.length === 0) {
    const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#3B81F6';

    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
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
              source={require('@/assets/images/parentandchildren.png')}
              style={styles.illustrationImage}
            />
          </View>

          <ThemedText style={styles.emptyTitle}>{t('noMessagesYet')}</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            {t('noMessagesDescription')}
          </ThemedText>

          <Pressable
  style={({ pressed }) => [
    styles.refreshButtonContainer,
    isRefreshing && styles.refreshButtonContainerLoading,
    {
      backgroundColor: isRefreshing
        ? (colorScheme === 'dark' ? '#2563EB' : 'rgba(59, 129, 246, 0.05)')
        : (colorScheme === 'dark' ? '#3B81F6' : '#3B81F61A'),
      opacity: pressed && !isRefreshing ? 0.7 : 1,
    },
  ]}
  android_ripple={{ color: '#3B81F633' }}
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
      <ThemedText style={[styles.refreshButtonText, { color: iconColor }]}>
        {t('refresh')}
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
        {messages.map(message => {
          const isRead = !!message.viewed_at;
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

          return (
            <Pressable
              key={message.id}
              onPress={() => handleOpenMessage(message)}
              style={[
                styles.card,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                  borderColor: !isRead
                    ? BrandColors[colorScheme]
                    : colorScheme === 'dark'
                      ? '#2C2C2E'
                      : '#E5E5EA',
                  borderWidth: !isRead ? 1.5 : 1,
                },
              ]}
            >
              <View style={styles.titleRow}>
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
                {message.content}
              </ThemedText>

              <View style={styles.bottomRow}>
                <View style={styles.dateAndStatus}>
                  <ThemedText
                    style={[
                      styles.date,
                      {
                        color: colorScheme === 'dark' ? '#8E8E93' : '#666666',
                      },
                      isRead && styles.readOpacity,
                    ]}
                  >
                    {localDateTime.toFormat('dd.MM.yyyy   HH:mm')}
                  </ThemedText>

                  <Ionicons
                    name={isRead ? 'checkmark-done' : 'checkmark'}
                    size={16}
                    color={colorScheme === 'dark' ? '#0A84FF' : '#2089dc'}
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
                        color: colorScheme === 'dark' ? '#0A84FF' : '#2089dc',
                      },
                    ]}
                  >
                    {t('continueReading')}
                  </ThemedText>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colorScheme === 'dark' ? '#0A84FF' : '#2089dc'}
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>
              </View>
            </Pressable>
          );
        })}

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
                {t('loadMoreMessages')}
              </ThemedText>
            )}
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  noMessagesContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 40,
    paddingTop: 56,
  },
  noMessagesIllustration: {
    marginBottom: 4,
    alignItems: 'center',
    width: '100%',
  },
  illustrationImage: {
  width: '100%',
  height: 250,
  resizeMode: 'contain',
  },
  content: {
    paddingBottom: 24,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 9,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
    marginBottom: 40,
  },
  retryButton: {
    backgroundColor: '#005678',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  refreshButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
    zIndex: 1,
    position: 'relative',
    marginHorizontal: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.09,
    shadowRadius: 1,
    elevation: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    marginRight: 15,
    width: '100%',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 20,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 10,
  },
  groupBadge: {
    backgroundColor: colors.success,
    color: 'white',
    padding: 5,
    borderRadius: 5,
    fontSize: 12,
    overflow: 'hidden',
  },
  preview: {
    fontSize: 16,
    lineHeight: 21,
    marginTop: 5,
  },
  date: {
    fontSize: 12,
    fontWeight: '300',
  },
  readOpacity: {
    opacity: 0.6,
  },
  dateAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
    flexWrap: 'wrap',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  readMoreText: {
    fontWeight: '600',
    fontSize: 33 / 2,
  },
  loadMoreButton: {
    marginTop: 10,
    marginHorizontal: 15,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#005678',
  },
  loadMoreButtonDisabled: {
    opacity: 0.8,
  },
  loadMoreText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
