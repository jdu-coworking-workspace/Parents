import { createHmac, timingSafeEqual } from 'crypto';

import { config } from '../config';

export type ForgotPasswordSession = {
    token: string;
    expiresAt: number;
    verificationCode?: string;
};

type ForgotPasswordTokenPayload = {
    identifier: string;
    verificationCode?: string;
    expiresAt: number;
};

function getSigningSecret(): string {
    return (
        process.env.FORGOT_PASSWORD_RESET_TOKEN_SECRET ||
        config.SECRET_ACCESS_KEY ||
        config.STUDENT_CLIENT_ID
    );
}

function base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payload: string): string {
    return createHmac('sha256', getSigningSecret())
        .update(payload)
        .digest('base64url');
}

function signaturesMatch(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected, 'base64url');
    const actualBuffer = Buffer.from(actual, 'base64url');

    return (
        expectedBuffer.length === actualBuffer.length &&
        timingSafeEqual(expectedBuffer, actualBuffer)
    );
}

function createToken(payload: ForgotPasswordTokenPayload): string {
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    return `${encodedPayload}.${sign(encodedPayload)}`;
}

function parseToken(token: string): ForgotPasswordTokenPayload | null {
    const [encodedPayload, signature, ...extra] = token.split('.');

    if (!encodedPayload || !signature || extra.length > 0) {
        return null;
    }

    if (!signaturesMatch(sign(encodedPayload), signature)) {
        return null;
    }

    try {
        const payload = JSON.parse(
            base64UrlDecode(encodedPayload)
        ) as ForgotPasswordTokenPayload;

        if (
            !payload ||
            typeof payload.identifier !== 'string' ||
            typeof payload.expiresAt !== 'number'
        ) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

function isExpired(session: ForgotPasswordSession, now = Date.now()): boolean {
    return !session?.expiresAt || session.expiresAt <= now;
}

export async function getForgotPasswordSession(
    identifier: string,
    token?: string
): Promise<ForgotPasswordSession | null> {
    if (!token) {
        return null;
    }

    const payload = parseToken(token);

    if (!payload || payload.identifier !== identifier) {
        return null;
    }

    const session = {
        token,
        expiresAt: payload.expiresAt,
        verificationCode: payload.verificationCode,
    };

    return isExpired(session) ? null : session;
}

export async function setForgotPasswordSession(
    identifier: string,
    session: ForgotPasswordSession
): Promise<ForgotPasswordSession> {
    const signedSession = {
        ...session,
        token: createToken({
            identifier,
            verificationCode: session.verificationCode,
            expiresAt: session.expiresAt,
        }),
    };

    return signedSession;
}

export async function deleteForgotPasswordSession(
    _identifier: string
): Promise<void> {
    // Stateless signed reset tokens do not require server-side cleanup.
}
