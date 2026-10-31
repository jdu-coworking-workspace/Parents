import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { Language } from '@/types/i18n';

export const MESSAGES_WIDGET_NAME = 'RecentMessages';
export const WIDGET_MAX_ITEMS = 10;

const SNAPSHOT_STORAGE_KEY = 'widget_recent_messages';
const LANGUAGES: Language[] = ['en', 'ja', 'uz', 'ru'];

export type WidgetMessage = {
  id: number;
  studentId: number;
  title: string;
  preview: string;
  studentName: string | null;
  sentTime: string;
  priority: 'high' | 'medium' | 'low';
  unread: boolean;
};

/**
 * What the home screen widget shows. Stored in AsyncStorage so the widget
 * can be redrawn from the headless widget task without opening the app.
 */
export type WidgetSnapshot = {
  signedIn: boolean;
  messages: WidgetMessage[];
  unreadCount: number;
  updatedAt: string;
};

export const signedOutSnapshot = (): WidgetSnapshot => ({
  signedIn: false,
  messages: [],
  unreadCount: 0,
  updatedAt: new Date().toISOString(),
});

export async function loadWidgetSnapshot(): Promise<WidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WidgetSnapshot;
  } catch (error) {
    console.warn('[Widget] Failed to read snapshot:', error);
  }

  // Nothing stored yet: assume signed in if a session exists
  const session = await AsyncStorage.getItem('session').catch(() => null);
  return { ...signedOutSnapshot(), signedIn: Boolean(session) };
}

export async function saveWidgetSnapshot(snapshot: WidgetSnapshot) {
  try {
    await AsyncStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('[Widget] Failed to save snapshot:', error);
  }
}

export async function getWidgetLanguage(): Promise<Language> {
  const stored = await AsyncStorage.getItem('language').catch(() => null);
  return LANGUAGES.includes(stored as Language) ? (stored as Language) : 'en';
}

/**
 * Deep link that opens a message screen, e.g. jduapp://student/1/message/2
 */
export function buildMessageDeepLink(studentId: number, messageId: number) {
  const configured = Constants.expoConfig?.scheme;
  const scheme =
    (Array.isArray(configured) ? configured[0] : configured) || 'jduapp';
  return `${scheme}://student/${studentId}/message/${messageId}`;
}

/**
 * Sort newest first and drop duplicates. The same post can be stored once per
 * group it was sent to (same student, title and sent time).
 */
export function normalizeWidgetMessages(
  messages: WidgetMessage[]
): WidgetMessage[] {
  const seen = new Set<string>();
  // sent_time is either "yyyy-MM-dd HH:mm" (API) or ISO (demo data)
  const sortKey = (message: WidgetMessage) =>
    (message.sentTime ?? '').replace('T', ' ');

  return [...messages]
    .sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1))
    .filter(message => {
      const key = `${message.studentId}|${message.title}|${message.sentTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, WIDGET_MAX_ITEMS);
}
