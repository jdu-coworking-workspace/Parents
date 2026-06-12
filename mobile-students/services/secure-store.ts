import * as SecureStore from 'expo-secure-store';

import type { StudentUser } from '@/types/auth';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const STUDENT_USER_KEY = 'student_user';

export type StoredSession = {
    accessToken: string;
    refreshToken: string | null;
    user: StudentUser;
};

export async function saveSession(session: StoredSession): Promise<void> {
    const refreshTokenOp = session.refreshToken
        ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken)
        : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);

    await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
        refreshTokenOp,
        SecureStore.setItemAsync(STUDENT_USER_KEY, JSON.stringify(session.user)),
    ]);
}

export async function loadSession(): Promise<StoredSession | null> {
    const [accessToken, refreshToken, userRaw] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.getItemAsync(STUDENT_USER_KEY),
    ]);

    if (!accessToken || !userRaw) {
        return null;
    }

    try {
        const user = JSON.parse(userRaw) as StudentUser & { hasPassword?: boolean };
        return {
            accessToken,
            refreshToken: refreshToken ?? null,
            user: {
                ...user,
                hasPassword: user.hasPassword === true,
            },
        };
    } catch {
        return null;
    }
}

export async function clearSession(): Promise<void> {
    await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(STUDENT_USER_KEY),
    ]);
}

export async function getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}
