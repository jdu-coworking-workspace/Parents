import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { loadSession } from '@/services/secure-store';
import {
  fetchStudentMessages,
  fetchStudentUnreadCount,
} from '@/services/student-messages';
import type { Message } from '@/types/message';
import { toPreviewText } from '@/utils/message-text';
import { renderRecentMessagesWidget } from '@/widgets/RecentMessagesWidget';
import {
  MESSAGES_WIDGET_NAME,
  getWidgetLanguage,
  normalizeWidgetMessages,
  saveWidgetSnapshot,
  signedOutSnapshot,
  type WidgetSnapshot,
} from '@/widgets/widget-storage';

const isAndroid = Platform.OS === 'android';

export function buildWidgetSnapshot(
  messages: Message[],
  studentId: number,
  unreadCount?: number
): WidgetSnapshot {
  const items = normalizeWidgetMessages(
    messages.map(message => ({
      id: message.id,
      studentId,
      title: message.title,
      preview: toPreviewText(message.content),
      studentName: null,
      sentTime: message.sent_time,
      priority: message.priority,
      unread: !message.viewed_at,
    }))
  );

  return {
    signedIn: true,
    messages: items,
    unreadCount: unreadCount ?? items.filter(item => item.unread).length,
    updatedAt: new Date().toISOString(),
  };
}

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
 * Mirror the inbox the app is showing onto the widget.
 */
export async function syncMessagesWidget(
  messages: Message[],
  studentId: number,
  unreadCount?: number
) {
  if (!isAndroid) return;
  await publishWidgetSnapshot(
    buildWidgetSnapshot(messages, studentId, unreadCount)
  );
}

/**
 * Fetch the latest messages straight from the API.
 * Safe to run from the headless widget task (no React context needed).
 * Returns null when the current snapshot should be kept as is.
 */
export async function fetchWidgetSnapshotFromServer(): Promise<WidgetSnapshot | null> {
  const session = await loadSession().catch(() => null);
  if (!session) return signedOutSnapshot();

  try {
    const [messages, unreadCount] = await Promise.all([
      fetchStudentMessages(),
      fetchStudentUnreadCount().catch(() => undefined),
    ]);
    return buildWidgetSnapshot(messages, session.user.id, unreadCount);
  } catch (error) {
    // Offline or token expired: keep showing the last known messages
    console.warn('[Widget] Server refresh failed:', error);
    return null;
  }
}

export async function clearMessagesWidget() {
  await publishWidgetSnapshot(signedOutSnapshot());
}
