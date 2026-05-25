import { clearSession, getAccessToken, loadSession, saveSession } from '@/services/secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/mobile';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

export interface RequestOptions {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: any;
    requiresAuth?: boolean;
    suppressErrorLog?: boolean;
    timeout?: number;
}

interface RequestOptionsWithBody<TBody = unknown> {
    method?: HttpMethod;
    body?: TBody;
    headers?: Record<string, string>;
    requiresAuth?: boolean;
    suppressErrorLog?: boolean;
    timeout?: number;
}

interface ResponseEnvelope<T> {
    data: T;
    status: number;
    ok: boolean;
}

// Error classes for better error handling
export class ApiError extends Error {
    public readonly status: number;
    public readonly code?: string;
    public readonly responseData?: any;

    constructor(
        message: string,
        status: number = 0,
        code?: string,
        responseData?: any
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.responseData = responseData;
    }
}

export class NetworkError extends ApiError {
    constructor(message = 'Network request failed') {
        super(message, 0, 'NETWORK_ERROR');
        this.name = 'NetworkError';
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

let onUnauthorized: (() => void) | null = null;
let onForbidden: (() => void) | null = null;

export const setAuthCallbacks = (callbacks: {
    onUnauthorized?: () => void;
    onForbidden?: () => void;
}) => {
    onUnauthorized = callbacks.onUnauthorized || null;
    onForbidden = callbacks.onForbidden || null;
};

const getAuthToken = async (): Promise<string | null> => {
    try {
        return await getAccessToken();
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
};

const refreshSessionIfNeeded = async (): Promise<boolean> => {
    try {
        const session = await loadSession();

        if (!session?.refreshToken) {
            return false;
        }

        const response = await fetch(`${API_BASE_URL}/student/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh_token: session.refreshToken,
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.access_token) {
            return false;
        }

        await saveSession({
            accessToken: data.access_token,
            refreshToken: data.refresh_token ?? session.refreshToken,
            user: session.user,
        });

        return true;
    } catch (error) {
        console.error('Failed to refresh session:', error);
        return false;
    }
};

const buildHeaders = async (
    customHeaders?: Record<string, string>,
    requiresAuth = true
): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...customHeaders,
    };

    if (requiresAuth) {
        const token = await getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
};

export async function request<TResponse>(
    endpoint: string,
    options: RequestOptionsWithBody = {}
): Promise<ResponseEnvelope<TResponse>> {
    const {
        method = 'GET',
        body,
        headers: customHeaders,
        requiresAuth = true,
        suppressErrorLog = false,
        timeout = 30000, // 30 seconds default timeout
    } = options;

    const url = endpoint.startsWith('http')
        ? endpoint
        : `${API_BASE_URL}${endpoint}`;

    const headers = await buildHeaders(customHeaders, requiresAuth);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let shouldRetryAfterRefresh = false;

    try {
        let response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
            if (requiresAuth) {
                shouldRetryAfterRefresh = await refreshSessionIfNeeded();

                if (shouldRetryAfterRefresh) {
                    const refreshedHeaders = await buildHeaders(
                        customHeaders,
                        requiresAuth
                    );

                    response = await fetch(url, {
                        method,
                        headers: refreshedHeaders,
                        body: body ? JSON.stringify(body) : undefined,
                        signal: controller.signal,
                    });

                    const refreshedData = await response.json().catch(() => ({}));

                    if (response.status === 401) {
                        await clearSession().catch(() => undefined);
                        onUnauthorized?.();
                        throw new UnauthorizedError(
                            refreshedData.error || refreshedData.message || 'Unauthorized'
                        );
                    }

                    if (response.status === 403) {
                        await clearSession().catch(() => undefined);
                        onForbidden?.();
                        throw new ForbiddenError(
                            refreshedData.error || refreshedData.message || 'Forbidden'
                        );
                    }

                    if (!response.ok) {
                        throw new ApiError(
                            refreshedData.error || refreshedData.message || 'Request failed',
                            response.status,
                            undefined,
                            refreshedData
                        );
                    }

                    return {
                        data: refreshedData,
                        status: response.status,
                        ok: true,
                    };
                }

                await clearSession().catch(() => undefined);
                onUnauthorized?.();
                throw new UnauthorizedError();
            }

            throw new ApiError(
                data.error || data.message || 'Invalid credentials',
                response.status,
                undefined,
                data
            );
        }

        if (response.status === 403) {
            if (requiresAuth) {
                await clearSession().catch(() => undefined);
                onForbidden?.();
                throw new ForbiddenError();
            }

            throw new ApiError(
                data.error || data.message || 'Forbidden',
                response.status,
                undefined,
                data
            );
        }

        if (!response.ok) {
            throw new ApiError(
                data.error || data.message || 'Request failed',
                response.status,
                undefined,
                data
            );
        }

        return {
            data,
            status: response.status,
            ok: true,
        };
    } catch (error: any) {
        // Handle abort/timeout errors
        if (error instanceof Error && error.name === 'AbortError') {
            console.error('Request timeout');
            throw new NetworkError('Request timed out after ' + timeout + 'ms');
        }

        // Handle ApiError instances
        if (error instanceof ApiError) {
            // Don't log expected status codes that are handled by calling code
            // 401: Unauthorized, 403: NEW_PASSWORD_REQUIRED, 404: Not found (email not in system)
            if (
                !suppressErrorLog &&
                error.status !== 401 &&
                error.status !== 403 &&
                error.status !== 404
            ) {
                console.error('API Error:', error.message);
            }
            throw error;
        }

        // Handle network errors
        if (error instanceof Error) {
            console.error('Network Error:', error.message);
            throw new NetworkError(error.message || 'Network request failed');
        }

        // Handle unknown errors
        console.error('Unknown Error:', error);
        throw new NetworkError('An unknown error occurred');
    } finally {
        clearTimeout(timeoutId);
    }
}

// Convenience methods
const api = {
    get: <T,>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(endpoint, { ...options, method: 'GET' }),
    post: <T, TBody = unknown>(
        endpoint: string,
        body?: TBody,
        options?: Omit<RequestOptionsWithBody<TBody>, 'method' | 'body'>
    ) =>
        request<T>(endpoint, { ...options, method: 'POST', body }),
    put: <T, TBody = unknown>(
        endpoint: string,
        body?: TBody,
        options?: Omit<RequestOptionsWithBody<TBody>, 'method' | 'body'>
    ) =>
        request<T>(endpoint, { ...options, method: 'PUT', body }),
    patch: <T, TBody = unknown>(
        endpoint: string,
        body?: TBody,
        options?: Omit<RequestOptionsWithBody<TBody>, 'method' | 'body'>
    ) =>
        request<T>(endpoint, { ...options, method: 'PATCH', body }),
    delete: <T,>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export { API_BASE_URL };

export default api;
