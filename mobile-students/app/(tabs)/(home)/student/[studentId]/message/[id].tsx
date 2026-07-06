import { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { DateTime } from 'luxon';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { I18nContext } from '@/contexts/i18n-context';
import { fetchStudentMessage } from '@/services/student-messages';
import type { Message } from '@/types/message';

function getPriorityBadgeColor(priority: Message['priority']) {
  if (priority === 'high') {
    return '#FF2B2B';
  }

  if (priority === 'medium') {
    return '#F59E0B';
  }

  return '#16A34A';
}

export default function MessageDetailScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const pageBackgroundColor = isDark ? '#111215' : '#fff';
  const { t } = useContext(I18nContext);

  const { id } = useLocalSearchParams<{
    id?: string | string[];
    studentId?: string | string[];
  }>();

  const messageId = Array.isArray(id) ? id[0] : id;

  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

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
      console.error('Error loading student message:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [messageId]);

  useFocusEffect(
    useCallback(() => {
      void loadMessage();
    }, [loadMessage])
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
  };

  if (isLoading) {
    return (
      <ThemedView
        style={[styles.centeredContainer, { backgroundColor: pageBackgroundColor }]}
      >
        <ActivityIndicator size="large" color="#0A84FF" />
        <ThemedText style={styles.loadingText}>{t('loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (isError || !message) {
    return (
      <ThemedView
        style={[styles.centeredContainer, { backgroundColor: pageBackgroundColor }]}
      >
        <ThemedText style={styles.errorText}>
          {t('failedToRetrieveMessage')}
        </ThemedText>
        <Pressable style={styles.retryButton} onPress={() => void loadMessage()}>
          <ThemedText style={styles.retryButtonText}>{t('tryAgain')}</ThemedText>
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
  const formattedTime = localDateTime.toFormat('dd.MM.yyyy   HH:mm');

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackgroundColor }]}>
      <View style={[styles.card, { backgroundColor: pageBackgroundColor }]}>
        <View style={styles.titleRow}>
          <ThemedText
            style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}
          >
            {message.title}
          </ThemedText>
          <View
            style={[
              styles.badge,
              { backgroundColor: getPriorityBadgeColor(message.priority) },
            ]}
          >
            <ThemedText style={styles.badgeText}>
              {getPriorityLabel(message.priority)}
            </ThemedText>
          </View>
        </View>

        <ThemedText
          style={[styles.preview, { color: isDark ? '#E5E7EB' : '#1F2937' }]}
        >
          {message.content}
        </ThemedText>

        <View style={styles.footerRow}>
          <ThemedText
            style={[styles.date, { color: isDark ? '#6B7280' : '#6B7280' }]}
          >
            {formattedTime}
          </ThemedText>

          <Pressable onPress={handleCopy} style={styles.copyButton}>
            <Ionicons name="copy-outline" size={20} color="#0A84FF" />
            <ThemedText style={styles.copyText}>{t('copy')}</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
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
  card: {
    borderRadius: 8,
    padding: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 36 / 2,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  preview: {
    marginTop: 8,
    fontSize: 36 / 2,
    lineHeight: 26,
  },
  footerRow: {
    marginTop: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 32 / 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  copyText: {
    color: '#0A84FF',
    fontSize: 18,
    fontWeight: '500',
  },
});
