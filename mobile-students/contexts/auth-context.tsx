import React, { createContext, useContext, useEffect, useState } from "react";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  changeStudentTemporaryPassword,
  getStudentProfile,
  loginStudent,
  getStudentGoogleLoginUrl,
  parseStudentGoogleCallbackUrl,
} from "@/services/student-auth";
import {
  clearSession,
  loadSession,
  saveSession,
} from "@/services/secure-store";
import { setAuthCallbacks } from "@/services/api-client";
import type { PasswordState, StudentUser } from "@/types/auth";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: StudentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  passwordState: PasswordState | null;
  isLoading: boolean;
  isSignedIn: boolean;
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
  refreshProfile: () => Promise<void>;
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
  const [passwordState, setPasswordState] = useState<PasswordState | null>(null);
  const [firstLoginChallenge, setFirstLoginChallenge] =
    useState<FirstLoginChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = async (response: {
    access_token: string;
    refresh_token?: string | null;
    user: StudentUser;
    password_state?: PasswordState;
  }) => {
    await saveSession({
      accessToken: response.access_token,
      refreshToken: response.refresh_token ?? null,
      user: response.user,
    });

    setAccessToken(response.access_token);
    setRefreshToken(response.refresh_token ?? null);
    setUser(response.user);
    setPasswordState(response.password_state ?? null);
    setFirstLoginChallenge(null);
  };

  const refreshProfile = async (token?: string | null) => {
    const effectiveToken = token ?? accessToken;

    if (!effectiveToken) {
      return;
    }

    const profile = await getStudentProfile();
    setUser(profile.user);
    setPasswordState(profile.password_state);
  };

  // Restore token on app startup
  const restoreToken = async () => {
    try {
      setIsLoading(true);
      const session = await loadSession();

      if (session) {
        setAccessToken(session.accessToken);
        setRefreshToken(session.refreshToken);
        setUser(session.user);
        await refreshProfile(session.accessToken);
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

  const signIn = async (email: string, password: string) => {
    try {
      const response = await loginStudent(email, password);
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

    const response = await parseStudentGoogleCallbackUrl(result.url);
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
      await persistSession(response);
    } catch (error: any) {
      console.error("Complete first login error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await clearSession();

      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      setPasswordState(null);

      router.replace("/sign-in");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  useEffect(() => {
    setAuthCallbacks({
      onUnauthorized: () => {
        void signOut();
      },
    });
  }, [signOut]);

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    passwordState,
    isLoading,
    isSignedIn: !!accessToken && !!user,
    firstLoginChallenge,
    setFirstLoginChallenge,
    clearFirstLoginChallenge: () => setFirstLoginChallenge(null),
    signIn,
    signInWithGoogle,
    completeFirstLogin,
    signOut,
    restoreToken,
    refreshProfile,
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
