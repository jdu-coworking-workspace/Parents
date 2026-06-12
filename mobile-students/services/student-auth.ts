import api, { API_BASE_URL } from '@/services/api-client';
import type { StudentUser } from '@/types/auth';

type LoginInitiateResponse = {
    message?: string;
    message_key?: string;
    has_password?: boolean;
};

type BackendStudentUser = {
    id: number;
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
    has_password?: boolean;
};

type BackendStudentAuthResponse = {
    access_token: string;
    refresh_token: string | null;
    user: BackendStudentUser;
    school_name: string;
    has_password?: boolean;
};

export type StudentLoginResponse = {
    access_token: string;
    refresh_token: string | null;
    user: StudentUser;
    school_name: string;
    has_password?: boolean;
};

type GoogleStudentLoginResponse = {
    access_token: string;
    refresh_token: string | null;
    user: StudentUser;
    school_name: string;
};

type GoogleCallbackQuery = {
    access_token?: string;
    refresh_token?: string;
    user?: string;
    school_name?: string;
    error?: string;
    has_password?: string;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

function mapBackendStudentUser(user: BackendStudentUser, hasPasswordFallback?: boolean): StudentUser {
    return {
        id: user.id,
        email: user.email,
        phone_number: user.phone_number,
        given_name: user.given_name,
        family_name: user.family_name,
        hasPassword: user.has_password === true || hasPasswordFallback === true,
    };
}

function mapBackendStudentAuthResponse(
    payload: BackendStudentAuthResponse
): StudentLoginResponse {
    return {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        user: mapBackendStudentUser(payload.user, payload.has_password),
        school_name: payload.school_name,
        has_password: payload.has_password,
    };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await api.post<T>(path, body, { requiresAuth: false });
    return response.data;
}

function parseGoogleCallbackUrl(url: string): GoogleStudentLoginResponse {
    const parsedUrl = new URL(url);
    const params = Object.fromEntries(
        parsedUrl.searchParams.entries()
    ) as GoogleCallbackQuery;

    if (params.error) {
        throw new Error(params.error);
    }

    if (!params.access_token || !params.user) {
        throw new Error('oauth_missing_params');
    }

    const backendUser = JSON.parse(decodeURIComponent(params.user)) as BackendStudentUser;

    return {
        access_token: params.access_token,
        refresh_token: params.refresh_token ?? null,
        user: mapBackendStudentUser(backendUser, params.has_password === 'true'),
        school_name: params.school_name ? decodeURIComponent(params.school_name) : '',
    };
}

export function getStudentGoogleLoginUrl(): string {
    return `${API_BASE_URL}/student/google`;
}

export function parseStudentGoogleCallbackUrl(url: string): StudentLoginResponse {
    return parseGoogleCallbackUrl(url);
}

export async function initiateStudentLogin(email: string): Promise<LoginInitiateResponse> {
    return postJson<LoginInitiateResponse>('/student/login-initiate', {
        email,
    });
}

export async function loginStudent(
    email: string,
    password: string
): Promise<StudentLoginResponse> {
    const payload = await postJson<BackendStudentAuthResponse>('/student/login', {
        email,
        password,
    });

    console.log('AUTH_RESPONSE', payload);

    const mapped = mapBackendStudentAuthResponse(payload);

    accessToken = mapped.access_token;
    refreshToken = mapped.refresh_token;

    return mapped;
}

export async function changeStudentTemporaryPassword(
    email: string,
    tempPassword: string,
    newPassword: string
): Promise<StudentLoginResponse> {
    const payload = await postJson<BackendStudentAuthResponse>(
        '/student/change-temp-password',
        {
            email,
            temp_password: tempPassword,
            new_password: newPassword,
        }
    );

    console.log('AUTH_RESPONSE', payload);

    const mapped = mapBackendStudentAuthResponse(payload);

    accessToken = mapped.access_token;
    refreshToken = mapped.refresh_token;

    return mapped;
}

export async function changeStudentPassword(
    previousPassword: string,
    newPassword: string
): Promise<{ message?: string; message_key?: string; has_password?: boolean }> {
    const response = await api.post<
        { message?: string; message_key?: string; has_password?: boolean },
        { previous_password: string; new_password: string }
    >('/student/change-password', {
        previous_password: previousPassword,
        new_password: newPassword,
    }, {
        suppressErrorLog: true,
    });

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
): Promise<{ access_token: string; refresh_token: string; has_password?: boolean }> {
    return postJson<{ access_token: string; refresh_token: string; has_password?: boolean }>(
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
