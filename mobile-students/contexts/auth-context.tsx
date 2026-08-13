import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import {
  changeStudentTemporaryPassword,
  loginStudent,
  getStudentGoogleLoginUrl,
  parseStudentGoogleCallbackUrl,
  refreshStudentAccessToken,
} from "@/services/student-auth";
import DemoModeService from "@/services/demo-mode-service";
import {
  clearSession,
  loadSession,
  saveSession,
} from "@/services/secure-store";
import {
  initPushNotifications,
  sendPushTokenToBackend,
  setupNotificationHandler,
} from "@/services/push-notifications";
import { setAuthCallbacks } from "@/services/api-client";
import type { StudentUser } from "@/types/auth";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: StudentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  isDemoMode: boolean;
  firstLoginChallenge: FirstLoginChallenge | null;
  setFirstLoginChallenge: (challenge: FirstLoginChallenge) => void;
  clearFirstLoginChallenge: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  completeFirstLogin: (
    email: string,
    tempPassword: string,
    newPassword: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

type FirstLoginChallenge = {
  email: string;
  tempPassword: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [firstLoginChallenge, setFirstLoginChallenge] =
    useState<FirstLoginChallenge | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pushTokenRef = useRef<string | null>(null);
  const pushSetupStartedRef = useRef(false);
  const lastUploadedPushTokenRef = useRef<string | null>(null);
  const isAuthenticatedRef = useRef(false);
  const isDemoModeRef = useRef(false);
  const refreshTokenRef = useRef<string | null>(null);
  const userRef = useRef<StudentUser | null>(null);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const sessionGenerationRef = useRef(0);
  const signOutRef = useRef<() => Promise<void>>(async () => {});

  const persistSession = async (response: {
    access_token: string;
    refresh_token?: string | null;
    user: StudentUser;
  }) => {
    sessionGenerationRef.current += 1;

    await saveSession({
      accessToken: response.access_token,
      refreshToken: response.refresh_token ?? null,
      user: response.user,
    });

    setAccessToken(response.access_token);
    setRefreshToken(response.refresh_token ?? null);
    setUser(response.user);
    refreshTokenRef.current = response.refresh_token ?? null;
    userRef.current = response.user;
    setFirstLoginChallenge(null);
  };

  const refreshSession = async (): Promise<boolean> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const currentRefreshToken = refreshTokenRef.current;
        const currentUser = userRef.current;
        const currentSessionGeneration = sessionGenerationRef.current;

        if (!currentRefreshToken || !currentUser || isDemoModeRef.current) {
          return false;
        }

        const response = await refreshStudentAccessToken(currentRefreshToken);

        if (
          sessionGenerationRef.current !== currentSessionGeneration ||
          refreshTokenRef.current !== currentRefreshToken ||
          userRef.current?.id !== currentUser.id
        ) {
          return false;
        }

        await saveSession({
          accessToken: response.access_token,
          refreshToken: response.refresh_token ?? currentRefreshToken,
          user: currentUser,
        });

        if (sessionGenerationRef.current !== currentSessionGeneration) {
          if (!refreshTokenRef.current && !userRef.current) {
            await clearSession();
          }

          return false;
        }

        setAccessToken(response.access_token);
        setRefreshToken(response.refresh_token ?? currentRefreshToken);
        setUser(currentUser);
        refreshTokenRef.current = response.refresh_token ?? currentRefreshToken;
        userRef.current = currentUser;

        return true;
      } catch (error) {
        console.error("Error refreshing student session:", error);
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  // Restore token on app startup
  const restoreToken = async () => {
    try {
      setIsLoading(true);
      const session = await loadSession();
      const demoActive = await DemoModeService.isDemoModeActive();
      isDemoModeRef.current = demoActive;
      setIsDemoMode(demoActive);

      if (session) {
        sessionGenerationRef.current += 1;
        setAccessToken(session.accessToken);
        setRefreshToken(session.refreshToken);
        setUser(session.user);
        refreshTokenRef.current = session.refreshToken;
        userRef.current = session.user;
      }
    } catch (error) {
      console.error("Error restoring token:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Restore token on mount
  useEffect(() => {
    restoreToken();
  }, []);

  useEffect(() => {
    setAuthCallbacks({
      onUnauthorized: async (shouldAttemptRefresh) => {
        if (isDemoModeRef.current) {
          return false;
        }

        if (!shouldAttemptRefresh) {
          void signOutRef.current();
          return false;
        }

        const refreshed = await refreshSession();

        if (!refreshed) {
          void signOutRef.current();
        }

        return refreshed;
      },
      onForbidden: () => {
        if (isDemoModeRef.current) {
          return;
        }

        void signOutRef.current();
      },
    });
  }, []);

  useEffect(() => {
    isAuthenticatedRef.current = !!accessToken && !!user;
    refreshTokenRef.current = refreshToken;
    userRef.current = user;
  }, [accessToken, refreshToken, user]);

  useEffect(() => {
    isDemoModeRef.current = isDemoMode;
  }, [isDemoMode]);

  const syncPushToken = async (token: string) => {
    if (!isAuthenticatedRef.current) {
      return;
    }

    if (isDemoModeRef.current) {
      return;
    }

    if (lastUploadedPushTokenRef.current === token) {
      return;
    }

    const success = await sendPushTokenToBackend(token);
    if (success) {
      lastUploadedPushTokenRef.current = token;
    }
  };

  useEffect(() => {
    if (pushSetupStartedRef.current) {
      return;
    }

    pushSetupStartedRef.current = true;
    setupNotificationHandler();

    let isMounted = true;

    (async () => {
      const result = await initPushNotifications();

      if (!isMounted) {
        return;
      }

      if (result.status === "granted" && result.token) {
        pushTokenRef.current = result.token;
        await syncPushToken(result.token);
      }
    })();

    const pushTokenSubscription = Notifications.addPushTokenListener(
      ({ data }) => {
        console.log("Recipient Expo push token from your app:", data);
        pushTokenRef.current = data;
        void syncPushToken(data);
      },
    );

    return () => {
      isMounted = false;
      pushTokenSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!accessToken || !user || !pushTokenRef.current) {
      return;
    }

    void syncPushToken(pushTokenRef.current);
  }, [accessToken, user]);

  const signIn = async (email: string, password: string) => {
    try {
      if (DemoModeService.isDemoCredentials(email, password)) {
        await DemoModeService.enableDemoMode();
        isDemoModeRef.current = true;
        setIsDemoMode(true);
        await DemoModeService.simulateNetworkDelay();
        await persistSession(DemoModeService.getDemoSessionData());
        return;
      }

      const response = await loginStudent(email, password);
      await DemoModeService.disableDemoMode();
      isDemoModeRef.current = false;
      setIsDemoMode(false);
      await persistSession(response);
    } catch (error: any) {
      // Don't log expected 403 error (NEW_PASSWORD_REQUIRED challenge) - it's handled by caller
      if (error?.status !== 403) {
        console.error("Sign in error:", error);
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const authUrl = getStudentGoogleLoginUrl();
    const redirectUrl = "mobilestudents://sign-in";

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

    if (result.type !== "success" || !result.url) {
      throw new Error("Google login cancelled");
    }

    const response = parseStudentGoogleCallbackUrl(result.url);
    await DemoModeService.disableDemoMode();
    isDemoModeRef.current = false;
    setIsDemoMode(false);
    await persistSession(response);
  };

  const completeFirstLogin = async (
    email: string,
    tempPassword: string,
    newPassword: string,
  ) => {
    try {
      const response = await changeStudentTemporaryPassword(
        email,
        tempPassword,
        newPassword,
      );
      await DemoModeService.disableDemoMode();
      isDemoModeRef.current = false;
      setIsDemoMode(false);
      await persistSession(response);
    } catch (error: any) {
      console.error("Complete first login error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      sessionGenerationRef.current += 1;
      refreshPromiseRef.current = null;
      refreshTokenRef.current = null;
      userRef.current = null;

      await clearSession();
      await DemoModeService.disableDemoMode();

      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      isDemoModeRef.current = false;
      setIsDemoMode(false);

      router.replace("/sign-in");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  signOutRef.current = signOut;

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    isLoading,
    isSignedIn: !!accessToken && !!user,
    isDemoMode,
    firstLoginChallenge,
    setFirstLoginChallenge,
    clearFirstLoginChallenge: () => setFirstLoginChallenge(null),
    signIn,
    signInWithGoogle,
    completeFirstLogin,
    signOut,
    restoreToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
