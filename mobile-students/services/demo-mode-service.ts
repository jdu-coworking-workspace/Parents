import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEMO_CREDENTIALS,
  DEMO_MESSAGES,
  DEMO_SCHOOL_NAME,
  DEMO_USER,
} from '@/constants/demoData';
import type { StudentLoginResponse } from '@/services/student-auth';
import type { ListMessagesRequest, Message } from '@/types/message';

const DEMO_MODE_KEY = 'student_demo_mode_enabled';
const DEMO_PAGE_SIZE = 10;

class DemoModeService {
  private static instance: DemoModeService;
  private isDemoMode = false;
  private messages: Message[] = DEMO_MESSAGES.map(message => ({ ...message }));

  static getInstance(): DemoModeService {
    if (!DemoModeService.instance) {
      DemoModeService.instance = new DemoModeService();
    }

    return DemoModeService.instance;
  }

  isDemoCredentials(email: string, password: string): boolean {
    return (
      email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
      password === DEMO_CREDENTIALS.password
    );
  }

  isDemoEmail(email: string): boolean {
    return email.trim().toLowerCase() === DEMO_CREDENTIALS.email;
  }

  async enableDemoMode(): Promise<void> {
    this.isDemoMode = true;
    this.messages = DEMO_MESSAGES.map(message => ({ ...message }));
    await AsyncStorage.setItem(DEMO_MODE_KEY, 'true');
    console.log('[StudentDemoMode] Demo mode enabled with sample data');
  }

  async disableDemoMode(): Promise<void> {
    this.isDemoMode = false;
    this.messages = DEMO_MESSAGES.map(message => ({ ...message }));
    await AsyncStorage.removeItem(DEMO_MODE_KEY);
    console.log('[StudentDemoMode] Demo mode disabled');
  }

  async isDemoModeActive(): Promise<boolean> {
    if (this.isDemoMode) return true;

    const storedFlag = await AsyncStorage.getItem(DEMO_MODE_KEY);
    this.isDemoMode = storedFlag === 'true';

    return this.isDemoMode;
  }

  getDemoSessionData(): StudentLoginResponse {
    return {
      access_token: 'student_demo_access_token_' + Date.now(),
      refresh_token: 'student_demo_refresh_token_' + Date.now(),
      user: DEMO_USER,
      school_name: DEMO_SCHOOL_NAME,
    };
  }

  getDemoMessages(params: ListMessagesRequest = {}): Message[] {
    if (!this.isDemoMode) return [];

    for (const postId of params.read_post_ids ?? []) {
      this.markDemoMessageViewed(postId);
    }

    const lastPostId = params.last_post_id ?? 0;
    const startIndex = lastPostId
      ? this.messages.findIndex(message => message.id === lastPostId) + 1
      : 0;

    const safeStartIndex = startIndex > 0 ? startIndex : 0;

    return this.messages
      .slice(safeStartIndex, safeStartIndex + DEMO_PAGE_SIZE)
      .map(message => ({ ...message }));
  }

  getDemoMessage(postId: string | number): Message | null {
    if (!this.isDemoMode) return null;

    const numericPostId = Number(postId);
    const message = this.messages.find(item => item.id === numericPostId);

    return message ? { ...message } : null;
  }

  markDemoMessageViewed(postId: number): void {
    if (!this.isDemoMode) return;

    this.messages = this.messages.map(message =>
      message.id === postId && !message.viewed_at
        ? { ...message, viewed_at: new Date().toISOString() }
        : message
    );
  }

  getDemoUnreadCount(): number {
    if (!this.isDemoMode) return 0;

    return this.messages.filter(message => !message.viewed_at).length;
  }

  async simulateNetworkDelay(
    min: number = 300,
    max: number = 800
  ): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export default DemoModeService.getInstance();
