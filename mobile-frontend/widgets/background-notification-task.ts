import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import {
  addNotificationToMessagesWidget,
  fetchWidgetSnapshotFromServer,
  publishWidgetSnapshot,
} from '@/widgets/widget-sync';

const BACKGROUND_NOTIFICATION_TASK = 'WIDGET-BACKGROUND-NOTIFICATION-TASK';

function parseDataString(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

/**
 * Keeps the home screen widget fresh when a push arrives while the app is in
 * the background. Must be defined in module scope (imported from index.ts).
 */
TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }) => {
    if (error || !data || 'actionIdentifier' in data) return;
    // In the foreground AppWithNotifications already refreshes the widget
    if (AppState.currentState === 'active') return;

    const fresh = await fetchWidgetSnapshotFromServer();
    if (fresh) {
      await publishWidgetSnapshot(fresh);
      return;
    }

    // API not reachable: show what the push itself tells us
    const payload = data.data ?? {};
    const notification = (data.notification ?? {}) as Record<string, unknown>;
    const extra = { ...payload, ...parseDataString(payload.dataString) };
    // Expo delivers title/message/body inside the data payload on Android
    const body = parseDataString(payload.body);
    await addNotificationToMessagesWidget({
      title: (notification.title ?? extra.title) as string | undefined,
      body: (notification.body ?? extra.message) as string | undefined,
      data: { ...extra, ...body },
    });
  }
);

export function registerBackgroundNotificationTask() {
  if (Platform.OS !== 'android') return;

  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(error =>
    console.warn('[Widget] Failed to register notification task:', error)
  );
}
