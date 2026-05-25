import api, { API_BASE_URL } from '@/services/api-client';
import type { PasswordState, StudentUser } from '@/types/auth';

type LoginInitiateResponse = {
    message?: string;
    message_key?: string;
};

export type StudentLoginResponse = {
    access_token: string;
    refresh_token: string | null;
    user: StudentUser;
    school_name: string;
    password_state: PasswordState;
};

export type StudentProfileResponse = {
    user: StudentUser;
    school_name: string;
    password_state: PasswordState;
};

type GoogleCallbackQuery = {
    exchange_code?: string;
    error?: string;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

async function postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await api.post<T>(path, body, { requiresAuth: false });
    return response.data;
}

async function getJson<T>(path: string): Promise<T> {
    const response = await api.get<T>(path);
    return response.data as T;
}

async function exchangeGoogleCallbackUrl(url: string): Promise<StudentLoginResponse> {
    const parsedUrl = new URL(url);
    const params = Object.fromEntries(
        parsedUrl.searchParams.entries()
    ) as GoogleCallbackQuery;

    if (params.error) {
        throw new Error(params.error);
    }

    if (!params.exchange_code) {
        throw new Error('oauth_missing_params');
    }

    return await postJson<StudentLoginResponse>('/student/google/exchange', {
        exchange_code: params.exchange_code,
    });
}

export function getStudentGoogleLoginUrl(): string {
    return `${API_BASE_URL}/student/google`;
}

export async function parseStudentGoogleCallbackUrl(
    url: string
): Promise<StudentLoginResponse> {
    return await exchangeGoogleCallbackUrl(url);
}

export async function initiateStudentLogin(
    email: string
): Promise<LoginInitiateResponse> {
    return postJson<LoginInitiateResponse>('/student/login-initiate', {
        email,
    });
}

export async function loginStudent(
    email: string,
    password: string
): Promise<StudentLoginResponse> {
    const payload = await postJson<StudentLoginResponse>('/student/login', {
        email,
        password,
    });

    accessToken = payload.access_token;
    refreshToken = payload.refresh_token;

    return payload;
}

export async function getStudentProfile(): Promise<StudentProfileResponse> {
    return await getJson<StudentProfileResponse>('/student/me');
}

export async function changeStudentTemporaryPassword(
    email: string,
    tempPassword: string,
    newPassword: string
): Promise<StudentLoginResponse> {
    const payload = await postJson<StudentLoginResponse>(
        '/student/change-temp-password',
        {
            email,
            temp_password: tempPassword,
            new_password: newPassword,
        }
    );

    accessToken = payload.access_token;
    refreshToken = payload.refresh_token;

    return payload;
}

export async function setStudentPassword(
    newPassword: string,
    confirmPassword: string
): Promise<StudentProfileResponse> {
    const response = await api.post<
        StudentProfileResponse,
        { new_password: string; confirm_password: string }
    >(
        '/student/set-password',
        {
            new_password: newPassword,
            confirm_password: confirmPassword,
        },
        {
            suppressErrorLog: true,
        }
    );

    return response.data;
}

export async function changeStudentPassword(
    previousPassword: string,
    newPassword: string
): Promise<{ message?: string; message_key?: string }> {
    const response = await api.post<
        { message?: string; message_key?: string },
        { previous_password: string; new_password: string }
    >(
        '/student/change-password',
        {
            previous_password: previousPassword,
            new_password: newPassword,
        },
        {
            suppressErrorLog: true,
        }
    );

    return response.data;
}

export async function loginStudentWithTemporaryPassword(
    email: string,
    password: string
): Promise<StudentLoginResponse> {
    return loginStudent(email, password);
}

export async function refreshStudentAccessToken(
    refreshTokenValue: string
): Promise<{ access_token: string; refresh_token: string }> {
    return postJson<{ access_token: string; refresh_token: string }>(
        '/student/refresh-token',
        {
            refresh_token: refreshTokenValue,
        }
    );
}

export function clearStudentSession(): void {
    accessToken = null;
    refreshToken = null;
}

export function getStudentSession(): {
    accessToken: string | null;
    refreshToken: string | null;
} {
    return { accessToken, refreshToken };
}
