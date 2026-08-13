import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useAuth } from '@/contexts/auth-context';
import { fetchStudentUnreadCount } from '@/services/student-messages';

const UNREAD_CHECK_INTERVAL_MS = 3000;

type MessageContextType = {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  refreshVersion: number;
};

const MessageContext = createContext<MessageContextType>({
  unreadCount: 0,
  setUnreadCount: () => {},
  refreshVersion: 0,
});

export const useMessageContext = () => useContext(MessageContext);

export const MessageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isSignedIn } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const lastServerUnreadRef = useRef<number | null>(null);

  const bumpRefresh = useCallback(() => {
    setRefreshVersion(version => version + 1);
  }, []);

  useEffect(() => {
    const appStateRef = { current: AppState.currentState };

    const handleAppStateChange = (nextState: AppStateStatus) => {
      const wasBackgrounded = appStateRef.current.match(/inactive|background/);
      appStateRef.current = nextState;

      if (wasBackgrounded && nextState === 'active') {
        bumpRefresh();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    const receivedSubscription = Notifications.addNotificationReceivedListener(
      () => bumpRefresh()
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(() => bumpRefresh());

    return () => {
      appStateSubscription.remove();
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [bumpRefresh]);

  // Cheap unread check: only fetch the list when a new message actually arrives
  useEffect(() => {
    if (!isSignedIn) {
      lastServerUnreadRef.current = null;
      return;
    }

    let cancelled = false;

    const checkUnread = async () => {
      if (AppState.currentState !== 'active') return;

      try {
        const count = await fetchStudentUnreadCount();
        if (cancelled) return;

        const previous = lastServerUnreadRef.current;
        lastServerUnreadRef.current = count;
        setUnreadCount(count);

        if (previous !== null && count > previous) {
          bumpRefresh();
        }
      } catch {
        // Ignore transient unread-check errors
      }
    };

    void checkUnread();
    const intervalId = setInterval(checkUnread, UNREAD_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isSignedIn, bumpRefresh]);

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
      refreshVersion,
    }),
    [unreadCount, refreshVersion]
  );

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};
