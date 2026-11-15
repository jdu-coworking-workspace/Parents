import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  View,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTime } from 'luxon';
import { useSQLiteContext } from 'expo-sqlite';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Message, Student } from '@/constants/types';
import { colors } from '@/constants/Colors';
import { useNetwork } from '@/contexts/network-context';
import { useSession } from '@/contexts/auth-context';
import { I18nContext } from '@/contexts/i18n-context';
import Card from '@/components/card';
import { ThemedText } from '@/components/ThemedText';
import { Button, useTheme } from '@rneui/themed';
import {
  fetchMessagesFromDB,
  fetchReadButNotSentMessages,
  saveMessagesToDB,
} from '@/utils/queries';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useMessageContext } from '@/contexts/message-context';
import { useStudents } from '@/contexts/student-context';
import demoModeService from '@/services/demo-mode-service';
import apiClient, {
  UnauthorizedError,
  ForbiddenError,
} from '@/services/api-client';

const normalizeMessageImages = (post: any): string[] | null => {
  if (Array.isArray(post.images) && post.images.length > 0) {
    return post.images.filter(Boolean);
  }

  if (post.image) {
    return [post.image];
  }

  return null;
};

// Styles for the component
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  loadMoreButton: {
    marginTop: 10,
    marginHorizontal: 15,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 40,
  },
  noMessagesIllustration: {
    marginBottom: 2,
    alignItems: 'center',
    width: '100%',
  },
  illustrationImage: {
    width: '100%',
    height: 250,
    resizeMode: 'contain',
  },
  noMessagesIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  noMessagesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  noMessagesText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
    marginBottom: 40,
  },
  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  messageListContainer: {
    paddingBottom: 80,
    position: 'relative',
  },
  loadingSpinner: {
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  searchBox: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
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
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#3B81F6',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  filterCountBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563C5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  quickFilters: {
    gap: 8,
    paddingRight: 16,
  },
  quickFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  filterSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  actionSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    marginBottom: 18,
    backgroundColor: '#C7C7CC',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChoiceRow: {
    gap: 8,
    paddingBottom: 6,
  },
  filterChoice: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  activeFilterChoice: {
    backgroundColor: '#2F5BD3',
    borderColor: '#2F5BD3',
  },
  filterGroupTitle: {
    marginTop: 6,
    marginBottom: 4,
    fontSize: 15,
    fontWeight: '700',
    opacity: 0.7,
  },
  filterOptions: {
    gap: 0,
  },
  filterOption: {
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activeFilterOption: {
    backgroundColor: '#EAF2FF',
  },
  filterOptionLabel: {
    flex: 1,
    fontSize: 16,
  },
  filterOptionCheck: {
    marginLeft: 'auto',
  },
  option: {
    borderWidth: 1,
    borderColor: '#0A84FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeOption: {
    backgroundColor: '#0A84FF',
  },
  dateOption: {
    borderWidth: 1,
    borderColor: '#0A84FF',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendar: {
    borderTopWidth: 1,
    borderTopColor: '#D1D1D6',
    paddingTop: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  calendarWeekDay: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.55,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  selectedCalendarDay: {
    backgroundColor: '#0A84FF',
  },
  calendarDayText: {
    fontSize: 14,
  },
  selectedCalendarDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#0A84FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#888',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    gap: 14,
  },
  actionIcon: {
    width: 24,
  },
  actionLabel: {
    fontSize: 16,
  },
  selectedPreview: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 245,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  previewPriority: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  previewText: {
    marginTop: 6,
    fontSize: 16,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionHeadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A84FF',
  },
  allHeading: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySearchState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptySearchTitle: {
    fontSize: 16,
    opacity: 0.7,
  },
});

// Loading component for initial message loading
const MessageListLoading: React.FC = () => {
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator
        size='large'
        color={theme.colors.primary || '#005678'}
      />
      <ThemedText
        style={{
          marginTop: 12,
          color: textColor,
        }}
      >
        {i18n[language].loading}
      </ThemedText>
    </View>
  );
};

// No messages component
const NoMessagesState: React.FC<{
  onRefresh: () => void;
  isRefreshing: boolean;
}> = ({ onRefresh, isRefreshing }) => {
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.noMessagesContainer}>
      {/* Illustration */}
      <View style={styles.noMessagesIllustration}>
        <Image
          source={require('@/assets/images/parentandchildren.png')}
          style={styles.illustrationImage}
        />
      </View>

      <ThemedText style={[styles.noMessagesTitle, { color: textColor }]}>
        {i18n[language].noMessagesYet}
      </ThemedText>

      <ThemedText style={[styles.noMessagesText, { color: textColor }]}>
        {i18n[language].noMessagesDescription}
      </ThemedText>

      <Button
        title={i18n[language].refresh}
        onPress={onRefresh}
        buttonStyle={[
          styles.refreshButton,
          {
            backgroundColor:
              theme.mode === 'dark'
                ? colors.tintLight
                : `${colors.tintLight}1A`,
          },
        ]}
        disabledStyle={[
          styles.refreshButton,
          {
            backgroundColor:
              theme.mode === 'dark' ? '#2563EB' : `${colors.tintLight}0D`,
          },
        ]}
        titleStyle={{
          color: theme.mode === 'dark' ? 'white' : colors.tintLight,
        }}
        loading={isRefreshing}
        disabled={isRefreshing}
        loadingProps={{
          color: theme.mode === 'dark' ? 'white' : 'rgb(59, 129, 246)',
        }}
        icon={
          !isRefreshing ? (
            <Ionicons
              name='refresh-outline'
              size={20}
              color={theme.mode === 'dark' ? 'white' : 'rgb(59, 129, 246)'}
              style={{ marginRight: 8 }}
            />
          ) : undefined
        }
      />
    </View>
  );
};

// Group messages by title, content, and sent_time
const groupMessages = (
  messages: Message[]
): { key: string; messages: Message[] }[] => {
  const messageMap = new Map<string, Message[]>();

  messages.forEach(message => {
    const sentTimestamp = message.sent_time
      ? new Date(message.sent_time).toISOString()
      : '';
    const compositeKey = `${message.title || ''}|-|${message.content || ''}|-|${sentTimestamp}`;
    if (!messageMap.has(compositeKey)) {
      messageMap.set(compositeKey, []);
    }
    messageMap.get(compositeKey)!.push(message);
  });

  return Array.from(messageMap, ([key, messages]) => ({ key, messages }));
};

const MessageList = ({
  studentId,
  onRefreshStudents,
}: {
  studentId: number;
  onRefreshStudents?: () => void;
}) => {
  // Contexts and hooks
  const db = useSQLiteContext();
  const { isOnline } = useNetwork();
  const { session, refreshToken, signOut, isDemoMode } = useSession();
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const textColor = useThemeColor({}, 'text');
  const { setUnreadCount } = useMessageContext();
  const { clearAndRefetch } = useStudents();

  // State management
  const [student, setStudent] = useState<Student | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  // Track if offline data has been loaded for current offline session
  const [hasLoadedOffline, setHasLoadedOffline] = useState(false);
  // Track previous online state to detect transitions
  const wasOnlineRef = useRef(isOnline);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMoreOffline, setIsLoadingMoreOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread'>(
    'all'
  );
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [sortByDateActive, setSortByDateActive] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    DateTime.local().startOf('month')
  );
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Message[] | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const loadedPreferencesKeyRef = useRef<string | null>(null);
  const readButNotSentMessageIDs = useRef<number[]>([]);
  const refetchRef = useRef<() => Promise<any>>(() => Promise.resolve());

  const [accountId, setAccountId] = useState<string>('anonymous');
  const preferencesKey = `parent-message-preferences:${accountId}:${studentId}`;

  useEffect(() => {
    db.getFirstAsync<{ id: number }>('SELECT id FROM user')
      .then(user => {
        if (user?.id) setAccountId(String(user.id));
      })
      .catch(error =>
        console.error('Error loading account preferences key:', error)
      );
  }, [db, session]);

  useEffect(() => {
    let cancelled = false;
    loadedPreferencesKeyRef.current = null;
    AsyncStorage.getItem(preferencesKey)
      .then(value => {
        if (cancelled || !value) return;
        const parsed = JSON.parse(value);
        setPinnedIds(
          Array.isArray(parsed.pinnedIds)
            ? parsed.pinnedIds.filter(
                (id: unknown): id is number => typeof id === 'number'
              )
            : []
        );
        setFavoriteIds(
          Array.isArray(parsed.favoriteIds)
            ? parsed.favoriteIds.filter(
                (id: unknown): id is number => typeof id === 'number'
              )
            : []
        );
      })
      .catch(error =>
        console.error('Error loading message preferences:', error)
      )
      .finally(() => {
        if (!cancelled) {
          loadedPreferencesKeyRef.current = preferencesKey;
          setPreferencesLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [preferencesKey]);

  useEffect(() => {
    if (
      !preferencesLoaded ||
      loadedPreferencesKeyRef.current !== preferencesKey
    ) {
      return;
    }
    AsyncStorage.setItem(
      preferencesKey,
      JSON.stringify({ pinnedIds, favoriteIds })
    ).catch(error => console.error('Error saving message preferences:', error));
  }, [preferencesKey, preferencesLoaded, pinnedIds, favoriteIds]);

  // Fetch student details based on studentId
  useEffect(() => {
    const loadStudent = async () => {
      try {
        const result = await db.getFirstAsync<Student>(
          'SELECT * FROM student WHERE id = ?',
          [studentId]
        );
        setStudent(result);
      } catch (error) {
        console.error('Error fetching student:', error);
      }
    };
    loadStudent();
  }, [db, studentId]);

  // Fetch messages from API (online mode) or demo mode
  const fetchMessagesFromAPI = async ({
    pageParam,
  }: {
    pageParam: { last_post_id: number; last_sent_at: string | null } | null;
  }) => {
    if (!student) return [];

    // Handle demo mode
    if (isDemoMode) {
      await demoModeService.simulateNetworkDelay(300, 800);

      const offset = pageParam?.last_post_id || 0;
      const limit = 10;
      const demoMessages = demoModeService.getDemoMessages(
        student.id,
        offset,
        limit
      );

      // Save demo messages to local database for consistency
      if (demoMessages.length > 0) {
        await saveMessagesToDB(
          db,
          demoMessages,
          student.student_number,
          student.id
        );
      }

      return demoMessages;
    }

    try {
      const requestBody: any = {
        student_id: student.id,
        read_post_ids: readButNotSentMessageIDs.current,
      };

      // Add pagination parameters if we have them
      if (pageParam) {
        requestBody.last_post_id = pageParam.last_post_id;
        requestBody.last_sent_at = pageParam.last_sent_at;
      } else {
        requestBody.last_post_id = 0;
      }

      const response = await apiClient.post<{ posts: any[] }>(
        '/posts',
        requestBody
      );
      const data = response.data;
      const adaptedPosts: Message[] = data.posts.map((post: any) => ({
        ...post,
        images: normalizeMessageImages(post),
      }));

      // Save messages to local database and sync read statuses
      await saveMessagesToDB(
        db,
        adaptedPosts,
        student.student_number,
        student.id
      );
      if (readButNotSentMessageIDs.current.length > 0) {
        await db.runAsync(
          `UPDATE message SET sent_status = 1 WHERE id IN (${readButNotSentMessageIDs.current.join(',')})`
        );
        readButNotSentMessageIDs.current = [];
      }
      return adaptedPosts;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        await signOut();
        return [];
      } else if (error instanceof ForbiddenError) {
        await signOut();
        return [];
      }
      console.error('Error fetching messages from API:', error);
      throw new Error('Failed to fetch messages');
    }
  };

  // Infinite query setup for message fetching (online, offline, and demo modes)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['messages', student?.id, isDemoMode ? 'demo' : 'regular'],
    queryFn: fetchMessagesFromAPI,
    initialPageParam: null,
    getNextPageParam: lastPage => {
      if (lastPage && lastPage.length > 0) {
        const lastMessage = lastPage[lastPage.length - 1];
        return {
          last_post_id: lastMessage.id,
          last_sent_at: lastMessage.sent_time,
        };
      }
      return undefined;
    },
    enabled: Boolean(student && session && (isDemoMode || isOnline)),
    retry: isDemoMode ? 0 : 2, // No retry in demo mode
    retryDelay: 1000,
    staleTime: isDemoMode ? 0 : 2 * 60 * 1000, // Always fresh in demo mode
    refetchInterval: isDemoMode ? false : undefined, // No auto-refetch in demo mode
  });

  // Update refetch ref when it changes
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Load offline messages when component mounts or goes offline
  useEffect(() => {
    const loadOfflineData = async () => {
      if (!student) {
        return;
      }

      wasOnlineRef.current = isOnline;

      if (isDemoMode || isOnline) {
        setHasLoadedOffline(true);
        return;
      }

      // Load from DB in background, but don't block UI if we have cached data
      try {
        const messages = await fetchMessagesFromDB(db, student.student_number);
        setLocalMessages(messages);
      } catch (error) {
        console.error('Error loading offline messages:', error);
      } finally {
        setHasLoadedOffline(true);
      }
    };
    loadOfflineData();
  }, [student, isOnline, isDemoMode, db]);

  // Prepare read messages data for online mode
  useEffect(() => {
    const prepareOnlineData = async () => {
      if (!student || !isOnline || !session) return;

      try {
        readButNotSentMessageIDs.current = await fetchReadButNotSentMessages(
          db,
          student.student_number
        );
      } catch (error) {
        console.error('Error syncing read statuses:', error);
      }
    };
    prepareOnlineData();
  }, [student, isOnline, db, session]);

  // Fetch unread count from API (online mode)
  const fetchUnreadCount = async () => {
    if (!student) return 0;

    if (isDemoMode) {
      // Demo mode: get unread count from demo service
      return demoModeService.getDemoUnreadCount(student.id);
    } else if (isOnline && session) {
      try {
        const response = await apiClient.get<any[]>('/unread');
        const list = response.data;
        const entry = Array.isArray(list)
          ? list.find((s: any) => s.id === student.id)
          : null;
        return entry?.unread_count ?? 0;
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          await signOut();
          return 0;
        } else if (error instanceof ForbiddenError) {
          await signOut();
          return 0;
        }
        throw error;
      }
    } else {
      // Offline mode: get unread_count from student table (cached from server)
      // This contains the actual count from the server, not just loaded messages
      const row = await db.getFirstAsync<{ unread_count: number }>(
        'SELECT unread_count FROM student WHERE id = ?',
        [student.id]
      );
      return row?.unread_count ?? 0;
    }
  };

  // Use React Query to fetch unread count
  const { refetch: refetchUnreadCount } = useQuery({
    queryKey: ['unreadCount', student?.id, isDemoMode ? 'demo' : 'regular'],
    queryFn: async () => {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
      return count;
    },
    enabled: Boolean(student),
    staleTime: isDemoMode ? 0 : 30 * 1000, // 30 seconds for online, always fresh for demo
    retry: isDemoMode ? 0 : 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Refetch unread count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchUnreadCount();
    }, [refetchUnreadCount])
  );

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        if (!student) return;
        if (isDemoMode) {
          // No need to refresh, data is static
        } else if (isOnline && session) {
          readButNotSentMessageIDs.current = await fetchReadButNotSentMessages(
            db,
            student.student_number
          );
          refetchRef.current();
        } else if (!isOnline) {
          const messages = await fetchMessagesFromDB(
            db,
            student.student_number
          );
          setLocalMessages(messages);
        }
        refetchUnreadCount();
      };
      refreshData();
    }, [student, isDemoMode, isOnline, db, session, refetchUnreadCount])
  );

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear cache and refresh students list only when online
      if (isOnline && !isDemoMode) {
        await clearAndRefetch();
      }

      if (isDemoMode) {
        // Demo mode: simulate refresh but don't actually fetch new data
        await demoModeService.simulateNetworkDelay(300, 600);
        await refetchRef.current(); // This will use demo data
      } else if (isOnline && session) {
        readButNotSentMessageIDs.current = await fetchReadButNotSentMessages(
          db,
          student!.student_number
        );
        await refetchRef.current();
      } else if (student) {
        const messages = await fetchMessagesFromDB(db, student.student_number);
        setLocalMessages(messages);
      }
      await refetchUnreadCount();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load more messages (infinite scrolling)
  const handleLoadMore = async () => {
    if (isDemoMode) {
      // Demo mode: use infinite query (which handles demo mode)
      if (hasNextPage && !isFetchingNextPage) {
        await fetchNextPage();
      }
    } else if (isOnline) {
      if (hasNextPage && !isFetchingNextPage) {
        await fetchNextPage();
      }
    } else if (student) {
      setIsLoadingMoreOffline(true);
      try {
        const newMessages = await fetchMessagesFromDB(
          db,
          student.student_number,
          localMessages.length // Offset for pagination
        );
        setLocalMessages(prev => [...prev, ...newMessages]);
      } catch (error) {
        console.error('Error loading more offline messages:', error);
      } finally {
        setIsLoadingMoreOffline(false);
      }
    }
  };

  const messageGroups = useMemo(() => {
    // When online or demo mode, use data from query
    if (isDemoMode || isOnline) {
      return groupMessages(data?.pages.flat() || []);
    }
    // When offline, prefer localMessages, but fallback to cached query data if available
    if (localMessages.length > 0) {
      return groupMessages(localMessages);
    }
    // If we have cached query data, use it while loading from DB
    if (data?.pages.flat().length) {
      return groupMessages(data.pages.flat());
    }
    return groupMessages([]);
  }, [isDemoMode, isOnline, data, localMessages]);

  const visibleMessageGroups = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const matchesDate = (sentTime: string) => {
      if (!dateFilter) return true;
      const parsed = sentTime.includes('T')
        ? DateTime.fromISO(sentTime, { zone: 'utc' })
        : DateTime.fromFormat(sentTime, 'yyyy-MM-dd HH:mm', { zone: 'utc' });
      return parsed.toLocal().toFormat('yyyy-MM-dd') === dateFilter;
    };

    return messageGroups
      .filter(group => {
        const firstMessage = group.messages[0];
        const isRead = group.messages.every(
          message => message.read_status === 1 || !!message.viewed_at
        );
        const searchableText =
          `${firstMessage.title} ${firstMessage.content} ${group.messages
            .map(message => message.group_name || '')
            .join(' ')}`
            .replace(/<[^>]+>/g, ' ')
            .toLocaleLowerCase();

        return (
          (!query || searchableText.includes(query)) &&
          (statusFilter === 'all' ||
            (statusFilter === 'read' && isRead) ||
            (statusFilter === 'unread' && !isRead)) &&
          (!dateFilter || matchesDate(firstMessage.sent_time)) &&
          (!priorityFilter || firstMessage.priority === priorityFilter) &&
          (!favoriteOnly || favoriteIds.includes(firstMessage.id)) &&
          (!pinnedOnly || pinnedIds.includes(firstMessage.id))
        );
      })
      .sort((a, b) => {
        const pinnedDifference =
          Number(pinnedIds.includes(b.messages[0].id)) -
          Number(pinnedIds.includes(a.messages[0].id));
        if (pinnedDifference !== 0) return pinnedDifference;
        if (sortByDateActive) {
          const getMillis = (sentTime: string) =>
            (sentTime.includes('T')
              ? DateTime.fromISO(sentTime, { zone: 'utc' })
              : DateTime.fromFormat(sentTime, 'yyyy-MM-dd HH:mm', {
                  zone: 'utc',
                })
            ).toMillis();
          return (
            getMillis(b.messages[0].sent_time) -
            getMillis(a.messages[0].sent_time)
          );
        }
        return 0;
      });
  }, [
    messageGroups,
    searchQuery,
    statusFilter,
    dateFilter,
    sortByDateActive,
    priorityFilter,
    favoriteOnly,
    pinnedOnly,
    favoriteIds,
    pinnedIds,
  ]);

  const pinnedVisibleGroups = useMemo(
    () =>
      visibleMessageGroups.filter(group =>
        pinnedIds.includes(group.messages[0].id)
      ),
    [visibleMessageGroups, pinnedIds]
  );
  const allVisibleGroups = useMemo(
    () =>
      visibleMessageGroups.filter(
        group => !pinnedIds.includes(group.messages[0].id)
      ),
    [visibleMessageGroups, pinnedIds]
  );

  const togglePinned = useCallback((messageId: number) => {
    setPinnedIds(current =>
      current.includes(messageId)
        ? current.filter(id => id !== messageId)
        : [messageId, ...current]
    );
  }, []);

  const toggleFavorite = useCallback((messageId: number) => {
    setFavoriteIds(current =>
      current.includes(messageId)
        ? current.filter(id => id !== messageId)
        : [...current, messageId]
    );
  }, []);

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setDateFilter(null);
    setSortByDateActive(false);
    setDatePickerVisible(false);
    setPriorityFilter(null);
    setFavoriteOnly(false);
    setPinnedOnly(false);
    setIsFilterOpen(false);
  }, []);

  const activeFilterCount =
    Number(statusFilter !== 'all') +
    Number(Boolean(dateFilter)) +
    Number(sortByDateActive) +
    Number(Boolean(priorityFilter)) +
    Number(favoriteOnly) +
    Number(pinnedOnly);

  // Check if we have any cached data available (either from React Query or local DB)
  const hasCachedData =
    (data?.pages.flat().length ?? 0) > 0 || localMessages.length > 0;

  // Check if the query is expected to run but hasn't produced any result yet.
  // This covers the gap between `student` being set (enabling the query) and
  // React Query actually starting to fetch (`isLoading` becoming true).
  // Without this, there is one render frame where student is set, isLoading is
  // false, and data is undefined — which would incorrectly show "no messages".
  const isQueryPending =
    !hasCachedData &&
    !data &&
    !isError &&
    Boolean(student && session && (isDemoMode || isOnline));

  // Show loading state during initial load
  // Don't show loading if we have cached data to display
  if (
    !student ||
    (!isDemoMode && isOnline && !session) ||
    (isLoading && (isDemoMode || (isOnline && session)) && !hasCachedData) ||
    (!isOnline && !isDemoMode && !hasLoadedOffline && !hasCachedData) ||
    isQueryPending
  ) {
    return <MessageListLoading />;
  }

  // Show error state if needed (but not for demo mode)
  if (isError && !isDemoMode && isOnline) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText
          style={[styles.errorText, { color: theme.colors.error || textColor }]}
        >
          {i18n[language].errorLoadingMessages}
        </ThemedText>
        <Button
          title={i18n[language].tryAgain}
          onPress={() => refetchRef.current()}
          buttonStyle={[styles.refreshButton, { backgroundColor: '#005678' }]}
          disabledStyle={[styles.refreshButton, { backgroundColor: '#003d56' }]}
          loadingProps={{
            color: theme.mode === 'dark' ? '#4a90a4' : '#ffffff',
          }}
        />
      </View>
    );
  }

  // Show no messages state
  if (messageGroups.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.mode === 'dark' ? '#000000' : '#FFFFFF' },
        ]}
      >
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ flex: 1, paddingTop: 16 }}
        >
          <NoMessagesState onRefresh={onRefresh} isRefreshing={refreshing} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.mode === 'dark' ? '#000000' : '#FFFFFF' },
      ]}
    >
      <View style={styles.toolbar}>
        <View style={styles.searchFilterRow}>
          <View
            style={[
              styles.searchBox,
              {
                borderWidth: 1.5,
                borderColor: '#3B81F6',
                backgroundColor: theme.mode === 'dark' ? '#1C1C1E' : '#F2F2F7',
              },
            ]}
          >
            <Ionicons name='search-outline' size={19} color='#3B81F6' />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={i18n[language].searchMessages}
              placeholderTextColor={theme.mode === 'dark' ? '#A1A1AA' : '#777'}
              style={[styles.searchInput, { color: textColor }]}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name='close-circle' size={18} color='#8E8E93' />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.filterControls}>
            <TouchableOpacity
              onPress={() => setIsFilterOpen(true)}
              style={[
                styles.filterButton,
                {
                  backgroundColor:
                    activeFilterCount > 0 ? '#3B81F6' : 'transparent',
                },
              ]}
            >
              <Ionicons
                name='options-outline'
                size={20}
                color={activeFilterCount > 0 ? '#FFFFFF' : '#2563C5'}
              />
              {activeFilterCount > 0 ? (
                <View style={styles.filterCountBadge}>
                  <ThemedText style={styles.filterCountText}>
                    {activeFilterCount}
                  </ThemedText>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFilters}
        >
          {[
            ['all', i18n[language].allMessages],
            ['favorite', i18n[language].favoriteMessages],
            ['pinned', i18n[language].pinnedMessages],
            ['important', i18n[language].important],
          ].map(([value, label]) => {
            const active =
              value === 'all'
                ? statusFilter === 'all' &&
                  !favoriteOnly &&
                  !pinnedOnly &&
                  !dateFilter &&
                  !sortByDateActive &&
                  !priorityFilter
                : value === 'favorite'
                  ? favoriteOnly
                  : value === 'pinned'
                    ? pinnedOnly
                    : value === 'important'
                      ? priorityFilter === 'high'
                      : statusFilter === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => {
                  if (value === 'all') resetFilters();
                  else if (value === 'favorite')
                    setFavoriteOnly(value => !value);
                  else if (value === 'pinned') setPinnedOnly(value => !value);
                  else if (value === 'important') {
                    setPriorityFilter(current =>
                      current === 'high' ? null : 'high'
                    );
                  } else setStatusFilter(value as 'read' | 'unread');
                }}
                style={[
                  styles.quickFilter,
                  {
                    borderColor: active ? '#2F5BD3' : '#D1D5DB',
                    backgroundColor: active ? '#2F5BD3' : 'transparent',
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: active
                      ? '#FFFFFF'
                      : theme.mode === 'dark'
                        ? '#F3F4F6'
                        : '#1F2937',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.messageListContainer}
      >
        <View>
          {pinnedVisibleGroups.length > 0 &&
          !searchQuery &&
          !dateFilter &&
          !sortByDateActive &&
          statusFilter === 'all' &&
          !favoriteOnly &&
          !pinnedOnly &&
          !priorityFilter ? (
            <View style={styles.sectionHeading}>
              <Ionicons name='pin' size={18} color='#0A84FF' />
              <ThemedText style={styles.sectionHeadingText}>
                {i18n[language].pinnedMessages}
              </ThemedText>
            </View>
          ) : null}
          {pinnedVisibleGroups.map(group => (
            <React.Fragment key={group.key}>
              <Card
                messageGroup={group.messages}
                studentId={student?.id || 0}
                isPinned={pinnedIds.includes(group.messages[0].id)}
                isFavorite={favoriteIds.includes(group.messages[0].id)}
                onLongPress={() => setSelectedGroup(group.messages)}
                onFavoriteToggle={() => toggleFavorite(group.messages[0].id)}
              />
            </React.Fragment>
          ))}
          {pinnedVisibleGroups.length > 0 &&
          allVisibleGroups.length > 0 &&
          !searchQuery &&
          !dateFilter &&
          !sortByDateActive &&
          statusFilter === 'all' &&
          !favoriteOnly &&
          !pinnedOnly &&
          !priorityFilter ? (
            <ThemedText style={styles.allHeading}>
              {i18n[language].allMessages}
            </ThemedText>
          ) : null}
          {allVisibleGroups.map(group => (
            <React.Fragment key={group.key}>
              <Card
                messageGroup={group.messages}
                studentId={student?.id || 0}
                isPinned={pinnedIds.includes(group.messages[0].id)}
                isFavorite={favoriteIds.includes(group.messages[0].id)}
                onLongPress={() => setSelectedGroup(group.messages)}
                onFavoriteToggle={() => toggleFavorite(group.messages[0].id)}
              />
            </React.Fragment>
          ))}
          {visibleMessageGroups.length === 0 ? (
            <View style={styles.emptySearchState}>
              <Ionicons name='search-outline' size={40} color='#8E8E93' />
              <ThemedText style={styles.emptySearchTitle}>
                {i18n[language].noMatchingMessages}
              </ThemedText>
            </View>
          ) : null}

          {/* Load more button */}
          {(hasNextPage ||
            (!isDemoMode && !isOnline && localMessages.length >= 10)) && (
            <Button
              title={i18n[language].loadMoreMessages}
              onPress={handleLoadMore}
              buttonStyle={[
                styles.loadMoreButton,
                { backgroundColor: '#005678' },
              ]}
              disabledStyle={[
                styles.loadMoreButton,
                { backgroundColor: '#003d56' },
              ]}
              disabled={
                isDemoMode || isOnline
                  ? !hasNextPage || isFetchingNextPage
                  : isLoadingMoreOffline
              }
              loading={
                isDemoMode || isOnline
                  ? isFetchingNextPage
                  : isLoadingMoreOffline
              }
              loadingProps={{
                color: theme.mode === 'dark' ? '#4a90a4' : '#ffffff',
              }}
            />
          )}
        </View>
      </ScrollView>
      <Modal
        visible={isFilterOpen}
        transparent
        animationType='fade'
        statusBarTranslucent
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsFilterOpen(false)}
        >
          <Pressable
            style={[
              styles.filterSheet,
              {
                backgroundColor: theme.mode === 'dark' ? '#1C1C1E' : '#FFFFFF',
              },
            ]}
            onPress={event => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <ThemedText style={styles.sheetTitle}>
              {i18n[language].filters}
            </ThemedText>
            <ThemedText style={styles.filterGroupTitle}>
              {i18n[language].important}
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChoiceRow}
            >
              {(['any', 'high', 'medium', 'low'] as const).map(value => (
                <TouchableOpacity
                  key={value}
                  onPress={() =>
                    setPriorityFilter(current =>
                      value === 'any' || current === value ? null : value
                    )
                  }
                  style={[
                    styles.filterChoice,
                    ((value === 'any' && !priorityFilter) ||
                      priorityFilter === value) &&
                      styles.activeFilterChoice,
                  ]}
                >
                  <ThemedText
                    style={{
                      color:
                        (value === 'any' && !priorityFilter) ||
                        priorityFilter === value
                          ? '#FFFFFF'
                          : textColor,
                    }}
                  >
                    {value === 'any'
                      ? i18n[language].anyImportance
                      : value === 'high'
                        ? i18n[language].critical
                        : value === 'medium'
                          ? i18n[language].important
                          : i18n[language].ordinary}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ThemedText style={styles.filterGroupTitle}>
              {i18n[language].messageStatus}
            </ThemedText>
            <View style={styles.filterOptions}>
              {(
                [
                  ['read', i18n[language].readMessages, 'mail-open-outline'],
                  [
                    'unread',
                    i18n[language].unreadMessages,
                    'mail-unread-outline',
                  ],
                  ['favorite', i18n[language].favoriteMessages, 'star-outline'],
                  ['date', i18n[language].sortByDate, 'calendar-outline'],
                ] as const
              ).map(([value, label, icon]) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => {
                    if (value === 'read' || value === 'unread') {
                      setStatusFilter(current =>
                        current === value ? 'all' : value
                      );
                    } else if (value === 'favorite') {
                      setFavoriteOnly(current => !current);
                    } else {
                      if (sortByDateActive) {
                        setSortByDateActive(false);
                        setDateFilter(null);
                        setDatePickerVisible(false);
                      } else {
                        setSortByDateActive(true);
                        setDatePickerVisible(true);
                        setCalendarMonth(DateTime.local().startOf('month'));
                      }
                    }
                  }}
                  style={[
                    styles.filterOption,
                    ((value === 'read' || value === 'unread') &&
                      statusFilter === value) ||
                    (value === 'favorite' && favoriteOnly) ||
                    (value === 'date' && sortByDateActive)
                      ? styles.activeFilterOption
                      : null,
                  ]}
                >
                  <Ionicons
                    name={icon}
                    size={22}
                    color={
                      ((value === 'read' || value === 'unread') &&
                        statusFilter === value) ||
                      (value === 'favorite' && favoriteOnly) ||
                      (value === 'date' && sortByDateActive)
                        ? '#0A84FF'
                        : textColor
                    }
                  />
                  <ThemedText style={styles.filterOptionLabel}>
                    {label}
                  </ThemedText>
                  {((value === 'read' || value === 'unread') &&
                    statusFilter === value) ||
                  (value === 'favorite' && favoriteOnly) ||
                  (value === 'date' && sortByDateActive) ? (
                    <Ionicons
                      name='checkmark'
                      size={21}
                      color='#0A84FF'
                      style={styles.filterOptionCheck}
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
            {datePickerVisible ? (
              <View style={styles.calendar}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    onPress={() =>
                      setCalendarMonth(month => month.minus({ months: 1 }))
                    }
                  >
                    <Ionicons name='chevron-back' size={20} color='#0A84FF' />
                  </TouchableOpacity>
                  <ThemedText style={styles.calendarTitle}>
                    {calendarMonth.toFormat('LLLL yyyy')}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() =>
                      setCalendarMonth(month => month.plus({ months: 1 }))
                    }
                  >
                    <Ionicons
                      name='chevron-forward'
                      size={20}
                      color='#0A84FF'
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarWeekRow}>
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                    <ThemedText key={day} style={styles.calendarWeekDay}>
                      {day}
                    </ThemedText>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {Array.from(
                    { length: calendarMonth.weekday - 1 },
                    (_, index) => (
                      <View key={`empty-${index}`} style={styles.calendarDay} />
                    )
                  )}
                  {Array.from(
                    { length: calendarMonth.daysInMonth },
                    (_, index) => {
                      const date = calendarMonth
                        .set({ day: index + 1 })
                        .toFormat('yyyy-MM-dd');
                      const selected = date === dateFilter;
                      return (
                        <TouchableOpacity
                          key={date}
                          style={[
                            styles.calendarDay,
                            selected && styles.selectedCalendarDay,
                          ]}
                          onPress={() => setDateFilter(date)}
                        >
                          <ThemedText
                            style={[
                              styles.calendarDayText,
                              selected && styles.selectedCalendarDayText,
                            ]}
                          >
                            {index + 1}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              </View>
            ) : null}
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <ThemedText>{i18n[language].resetFilters}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setIsFilterOpen(false)}
              >
                <ThemedText style={{ color: '#FFFFFF' }}>
                  {i18n[language].applyFilters}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={selectedGroup !== null}
        transparent
        animationType='fade'
        statusBarTranslucent
        onRequestClose={() => setSelectedGroup(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedGroup(null)}
        >
          {selectedGroup?.[0] ? (
            <View
              style={[
                styles.selectedPreview,
                {
                  backgroundColor:
                    theme.mode === 'dark' ? '#1C1C1E' : '#FFFFFF',
                },
              ]}
            >
              <View style={styles.previewTitleRow}>
                <ThemedText numberOfLines={1} style={styles.previewTitle}>
                  {selectedGroup[0].title}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.previewPriority,
                    {
                      backgroundColor:
                        selectedGroup[0].priority === 'high'
                          ? '#FF5B63'
                          : selectedGroup[0].priority === 'medium'
                            ? '#FFB84D'
                            : '#62B866',
                    },
                  ]}
                >
                  {selectedGroup[0].priority === 'high'
                    ? i18n[language].critical
                    : selectedGroup[0].priority === 'medium'
                      ? i18n[language].important
                      : i18n[language].ordinary}
                </ThemedText>
              </View>
              <ThemedText numberOfLines={2} style={styles.previewText}>
                {selectedGroup[0].content.replace(/<[^>]+>/g, ' ')}
              </ThemedText>
            </View>
          ) : null}
          <Pressable
            style={[
              styles.actionSheet,
              {
                backgroundColor: theme.mode === 'dark' ? '#1C1C1E' : '#FFFFFF',
              },
            ]}
            onPress={event => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setSelectedGroup(null);
              }}
            >
              <Ionicons
                name='link-outline'
                size={22}
                color='#0A84FF'
                style={styles.actionIcon}
              />
              <ThemedText style={styles.actionLabel}>
                {i18n[language].copyLink}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                if (selectedGroup?.[0]) togglePinned(selectedGroup[0].id);
                setSelectedGroup(null);
              }}
            >
              <Ionicons
                name={
                  selectedGroup?.[0] && pinnedIds.includes(selectedGroup[0].id)
                    ? 'pin'
                    : 'pin-outline'
                }
                size={22}
                color='#0A84FF'
                style={styles.actionIcon}
              />
              <ThemedText style={styles.actionLabel}>
                {i18n[language].pinMessage}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setSelectedGroup(null)}
            >
              <Ionicons
                name='mail-unread-outline'
                size={22}
                color='#0A84FF'
                style={styles.actionIcon}
              />
              <ThemedText style={styles.actionLabel}>
                {i18n[language].markUnread}
              </ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default MessageList;
