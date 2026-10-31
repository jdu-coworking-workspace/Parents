import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { SQLiteDatabase } from 'expo-sqlite';
import apiClient from '@/services/api-client';
import type { Student } from '@/constants/types';
import { toPreviewText } from '@/utils/message-text';
import { renderRecentMessagesWidget } from '@/widgets/RecentMessagesWidget';
import {
  MESSAGES_WIDGET_NAME,
  getWidgetLanguage,
  loadWidgetSnapshot,
  normalizeWidgetMessages,
  saveWidgetSnapshot,
  signedOutSnapshot,
  type WidgetMessage,
  type WidgetSnapshot,
} from '@/widgets/widget-storage';

const isAndroid = Platform.OS === 'android';

const fullName = (given?: string | null, family?: string | null) =>
  [given, family].filter(Boolean).join(' ') || null;

/**
 * Save the snapshot and redraw every widget instance on the home screen.
 */
export async function publishWidgetSnapshot(snapshot: WidgetSnapshot) {
  if (!isAndroid) return;

  await saveWidgetSnapshot(snapshot);
  const language = await getWidgetLanguage();

  try {
    await requestWidgetUpdate({
      widgetName: MESSAGES_WIDGET_NAME,
      renderWidget: () => renderRecentMessagesWidget(snapshot, language),
    });
  } catch (error) {
    console.warn('[Widget] Update failed:', error);
  }
}

/**
 * Rebuild the widget from the local SQLite cache (used while the app is open,
 * right after messages are saved or marked as read).
 */
export async function syncMessagesWidgetFromDB(db: SQLiteDatabase) {
  if (!isAndroid) return;

  try {
    const rows = await db.getAllAsync<{
      id: number;
      student_id: number;
      title: string;
      content: string;
      priority: WidgetMessage['priority'];
      sent_time: string;
      read_status: number;
      given_name: string | null;
      family_name: string | null;
    }>(
      `SELECT m.id, m.student_id, m.title, m.content, m.priority, m.sent_time,
              m.read_status, s.given_name, s.family_name
       FROM message m LEFT JOIN student s ON s.id = m.student_id
       ORDER BY m.sent_time DESC LIMIT 30`
    );
    const unread = await db.getFirstAsync<{ total: number | null }>(
      'SELECT SUM(unread_count) AS total FROM student'
    );

    await publishWidgetSnapshot({
      signedIn: true,
      messages: normalizeWidgetMessages(
        rows.map(row => ({
          id: row.id,
          studentId: row.student_id,
          title: row.title,
          preview: toPreviewText(row.content),
          studentName: fullName(row.given_name, row.family_name),
          sentTime: row.sent_time,
          priority: row.priority,
          unread: row.read_status !== 1,
        }))
      ),
      unreadCount: unread?.total ?? 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[Widget] Sync from DB failed:', error);
  }
}

/**
 * Fetch the latest messages for every student straight from the API.
 * Safe to run from the headless widget task (no React context needed).
 * Returns null when the current snapshot should be kept as is.
 */
export async function fetchWidgetSnapshotFromServer(): Promise<WidgetSnapshot | null> {
  const session = await AsyncStorage.getItem('session');
  if (!session) return signedOutSnapshot();

  // Demo data lives only in memory/DB of the running app
  if ((await AsyncStorage.getItem('demo_mode_enabled')) === 'true') return null;

  try {
    const { data: students } = await apiClient.get<Student[]>('/students');

    const perStudent = await Promise.all(
      students.map(async student => {
        const { data } = await apiClient.post<{ posts: any[] }>('/posts', {
          student_id: student.id,
          last_post_id: 0,
          read_post_ids: [],
        });
        return (data.posts ?? []).map(
          (post): WidgetMessage => ({
            id: post.id,
            studentId: student.id,
            title: post.title,
            preview: toPreviewText(post.content),
            studentName: fullName(student.given_name, student.family_name),
            sentTime: post.sent_time,
            priority: post.priority,
            unread: !post.viewed_at,
          })
        );
      })
    );

    let unreadCount = 0;
    try {
      const { data: unread } = await apiClient.get<any[]>('/unread');
      unreadCount = Array.isArray(unread)
        ? unread.reduce((sum, s) => sum + Number(s.unread_count ?? 0), 0)
        : 0;
    } catch {
      unreadCount = perStudent.flat().filter(m => m.unread).length;
    }

    return {
      signedIn: true,
      messages: normalizeWidgetMessages(perStudent.flat()),
      unreadCount,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    // Offline or token expired: keep showing the last known messages
    console.warn('[Widget] Server refresh failed:', error);
    return null;
  }
}

export async function refreshMessagesWidgetFromServer() {
  if (!isAndroid) return;

  const snapshot = await fetchWidgetSnapshotFromServer();
  if (snapshot) await publishWidgetSnapshot(snapshot);
}

/**
 * Put an incoming push notification on the widget right away. Used as a
 * fallback when the API can't be reached from the background.
 */
export async function addNotificationToMessagesWidget(notification: {
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
}) {
  if (!isAndroid) return;

  const url = String(notification.data?.url ?? '');
  const match = url.match(/student\/(\d+)\/message\/(\d+)/);
  const postId = Number(notification.data?.post_id ?? match?.[2]);
  if (!match || !postId) return;

  const current = await loadWidgetSnapshot();
  if (current.messages.some(m => m.id === postId)) return;

  await publishWidgetSnapshot({
    signedIn: true,
    messages: normalizeWidgetMessages([
      {
        id: postId,
        studentId: Number(match[1]),
        title: notification.title ?? '',
        preview: notification.body ?? '',
        studentName: (notification.data?.student_name as string) ?? null,
        sentTime: new Date().toISOString(),
        priority:
          (notification.data?.priority as WidgetMessage['priority']) ?? 'low',
        unread: true,
      },
      ...current.messages,
    ]),
    unreadCount: current.unreadCount + 1,
    updatedAt: new Date().toISOString(),
  });
}

export async function clearMessagesWidget() {
  await publishWidgetSnapshot(signedOutSnapshot());
}
