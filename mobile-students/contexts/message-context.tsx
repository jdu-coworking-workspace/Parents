import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);

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
