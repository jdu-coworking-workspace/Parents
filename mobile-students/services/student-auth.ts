import api, { API_BASE_URL } from '@/services/api-client';
import type { StudentUser } from '@/types/auth';

type LoginInitiateResponse = {
    message?: string;
    message_key?: string;
    show_temporary_password_message?: boolean;
};

type ForgotPasswordInitiateResponse = {
    message?: string;
    message_key?: string;
};

type ForgotPasswordVerifyResponse = {
    message: string;
    message_key?: string;
    reset_token: string;
};

type ForgotPasswordSetPasswordResponse = {
    message: string;
};

type StudentPasswordStatusResponse = {
    has_cognito_password: boolean;
    cognito_status?: string;
};

export type StudentLoginResponse = {
    access_token: string;
    refresh_token: string | null;
    user: StudentUser;
    school_name: string;
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
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

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

    return {
        access_token: params.access_token,
        refresh_token: params.refresh_token ?? null,
        user: JSON.parse(decodeURIComponent(params.user)) as StudentUser,
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

export async function initiateStudentForgotPassword(
    email: string
): Promise<ForgotPasswordInitiateResponse> {
    return postJson<ForgotPasswordInitiateResponse>(
        '/student/forgot-password-initiate',
        {
            email,
        }
    );
}

export async function verifyStudentForgotPasswordCode(
    email: string,
    verificationCode: string
): Promise<ForgotPasswordVerifyResponse> {
    return postJson<ForgotPasswordVerifyResponse>(
        '/student/forgot-password-verify-code',
        {
            email,
            verification_code: verificationCode,
        }
    );
}

export async function setStudentForgotPassword(
    email: string,
    newPassword: string,
    resetToken: string
): Promise<ForgotPasswordSetPasswordResponse> {
    return postJson<ForgotPasswordSetPasswordResponse>(
        '/student/forgot-password-set-password',
        {
            email,
            new_password: newPassword,
            reset_token: resetToken,
        }
    );
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

export async function changeStudentPassword(
    previousPassword: string,
    newPassword: string
): Promise<{ message?: string; message_key?: string }> {
    const response = await api.post<
        { message?: string; message_key?: string },
        { previous_password: string; new_password: string }
    >('/student/change-password', {
        previous_password: previousPassword,
        new_password: newPassword,
    }, {
        suppressErrorLog: true,
    });

    return response.data;
}

export async function getStudentPasswordStatus(): Promise<StudentPasswordStatusResponse> {
    const response = await api.get<StudentPasswordStatusResponse>(
        '/student/password-status',
        {
            suppressErrorLog: true,
        }
    );

    return response.data;
}

export async function createStudentFirstPassword(
    newPassword: string
): Promise<{ message?: string; message_key?: string }> {
    const response = await api.post<
        { message?: string; message_key?: string },
        { new_password: string }
    >('/student/first-password', {
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
