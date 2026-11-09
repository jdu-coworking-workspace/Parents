import type * as ExpoNotifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Since SDK 55, importing expo-notifications in Expo Go on Android throws.
export const Notifications: typeof ExpoNotifications | null =
  Platform.OS === 'android' && isRunningInExpoGo()
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('expo-notifications');

export type PushPermission =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'device_unsupported'
  | 'expo_go_unsupported'
  | 'error';

export interface PushInitResult {
  status: PushPermission;
  token?: string;
  error?: unknown;
}

export function isExpoGo(): boolean {
  return isRunningInExpoGo();
}

export async function initPushNotifications(): Promise<PushInitResult> {
  try {
    if (isExpoGo() || !Notifications) {
      return { status: 'expo_go_unsupported' };
    }

    if (!Device.isDevice) {
      return { status: 'device_unsupported' };
    }

    // 1️⃣ Android: Create high-priority channels BEFORE asking for permission
    if (Platform.OS === 'android') {
      // Create multiple channels for different notification types
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.MAX, // Changed from DEFAULT to MAX
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // Create a high-priority channel for important notifications
      await Notifications.setNotificationChannelAsync('high-priority', {
        name: 'Important Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF0000',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // Create channel for critical notifications
      await Notifications.setNotificationChannelAsync('critical', {
        name: 'Critical Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000],
        lightColor: '#FF0000',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    }

    // 2️⃣ Request permissions with proper iOS handling
    const settings = await Notifications.getPermissionsAsync();
    let status = settings.status;

    if (status !== 'granted') {
      const request = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: true,
          allowProvisional: false,
        },
      });
      status = request.status;
    }

    if (status !== 'granted') {
      console.log('[Push] Notification permission not granted');
      return { status };
    }

    // iOS: Reset badge count (recommended)
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(0);
    }

    // 3️⃣ Get Expo push token with EAS project ID (CRITICAL for preview builds)
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    console.log('[Push] Using project ID:', projectId);

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    console.log('[Push] Device token →', token);

    return { status: 'granted', token };
  } catch (error) {
    console.error('[Push] Init error →', error);
    return { status: 'error', error };
  }
}

// Enhanced notification handler for iOS preview builds
export function setupNotificationHandler() {
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async notification => {
      console.log(
        '[Push] Handling notification:',
        notification.request.content.title
      );
      return {
        shouldShowAlert: true, // CRITICAL: Show alerts even when app is in foreground
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });

  // Add listener to log received notifications for debugging
  Notifications.addNotificationReceivedListener(notification => {
    console.log('[Push] ✅ Notification received:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
    });
  });

  // Add listener for notification response (when user taps)
  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('[Push] 👆 Notification tapped:', {
      title: response.notification.request.content.title,
      data: response.notification.request.content.data,
    });
  });
}

// Helper function to send notifications with proper channel and priority
export async function sendLocalNotification(
  title: string,
  body: string,
  data: any = {},
  priority: 'default' | 'high' | 'critical' = 'default'
) {
  if (!Notifications) return;

  const channelId =
    priority === 'critical'
      ? 'critical'
      : priority === 'high'
        ? 'high-priority'
        : 'default';

  const notificationContent: any = {
    title,
    body,
    data,
    sound: 'default',
    badge: 1,
  };

  // Add Android-specific properties
  if (Platform.OS === 'android') {
    notificationContent.android = {
      channelId,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  }

  await Notifications.scheduleNotificationAsync({
    content: notificationContent,
    trigger: null, // Send immediately
  });
}

// Function to check and guide users to disable battery optimization
export async function checkBatteryOptimization(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  // Note: There's no direct API to check battery optimization status
  // You'll need to guide users manually or use a native module
  console.log('Battery optimization should be checked by user');
  return true;
}

// Function to guide users to notification settings
export async function openNotificationSettings() {
  try {
    if (Platform.OS === 'android') {
      // For Android, we'll use Linking to open app settings
      await Linking.openSettings();
    } else {
      // For iOS, we'll use Linking to open app settings
      await Linking.openURL('app-settings:');
    }
  } catch (error) {
    console.error('Failed to open settings:', error);
  }
}

/**
 * Upload the push‑token to your backend.
 * Returns `true` when the request was accepted (2xx),
 * `false` on any other outcome — but never *throws*.
 */
export async function sendPushTokenToBackend(token: string): Promise<boolean> {
  try {
    const session = await AsyncStorage.getItem('session');
    if (!session) {
      console.log('[Push] No session yet - will retry when user logs in');
      return false;
    }

    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/device-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      console.warn('[Push] Upload failed →', detail);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Push] Network error while uploading token →', err);
    return false;
  }
}

/**
 * Legacy function for backward compatibility.
 * Use initPushNotifications() instead for better error handling and features.
 */
export async function registerForPushNotificationsAsync() {
  const result = await initPushNotifications();

  if (result.status === 'granted' && result.token) {
    return result.token;
  }

  // Push is unavailable in Expo Go and simulators; log in without a token.
  if (
    result.status === 'expo_go_unsupported' ||
    result.status === 'device_unsupported'
  ) {
    console.log(`[Push] Skipping push token (${result.status})`);
    return undefined;
  }

  if (result.status === 'denied') {
    throw new Error(
      'Permission not granted to get push token for push notification!'
    );
  } else if (result.error) {
    throw new Error(`${result.error}`);
  }

  return undefined;
}
