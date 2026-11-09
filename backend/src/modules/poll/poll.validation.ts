import { ApiError } from '../../errors/ApiError';

export const POLL_QUESTION_MAX = 500;
export const POLL_OPTION_MAX = 255;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;
const TITLE_MAX = 255;

export interface PollInput {
    question: string;
    options: string[];
}

function plainText(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null;
    const text = value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > max) return null;
    return text;
}

export function hasVisibleHtml(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    if (/<img\b/i.test(value)) return true;
    const text = value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > 0;
}

/**
 * Poll body yo'q bo'lsa null.
 * Yuborilgan bo'lsa savol va 2–10 ta takrorlanmas variant qaytaradi.
 */
export function parsePollBody(poll: unknown): PollInput | null {
    if (poll === undefined || poll === null) return null;
    if (typeof poll !== 'object' || Array.isArray(poll)) {
        throw new ApiError(400, 'invalid_poll_options');
    }

    const body = poll as { question?: unknown; options?: unknown };
    const question = plainText(body.question, POLL_QUESTION_MAX);
    if (!question) {
        throw new ApiError(400, 'invalid_poll_question');
    }

    if (
        !Array.isArray(body.options) ||
        body.options.length < POLL_MIN_OPTIONS ||
        body.options.length > POLL_MAX_OPTIONS
    ) {
        throw new ApiError(400, 'invalid_poll_options');
    }

    const options: string[] = [];
    const seen = new Set<string>();
    for (const option of body.options) {
        const text = plainText(option, POLL_OPTION_MAX);
        if (!text) {
            throw new ApiError(400, 'invalid_poll_options');
        }
        const key = text.toLowerCase();
        if (seen.has(key)) {
            throw new ApiError(400, 'duplicate_poll_options');
        }
        seen.add(key);
        options.push(text);
    }

    return { question, options };
}

/**
 * Oddiy xabar: sarlavha va matn ikkalasi ham kerak.
 * So'rovnoma bilan: ikkalasi ham bo'sh, yoki ikkalasi ham to'ldirilgan bo'lishi mumkin.
 */
export function normalizePostContent(input: {
    title: unknown;
    description: unknown;
    allowEmpty: boolean;
}): { title: string; description: string } {
    const title =
        typeof input.title === 'string' && input.title.trim().length > 0
            ? input.title.trim()
            : '';
    const description =
        hasVisibleHtml(input.description) && typeof input.description === 'string'
            ? input.description.trim()
            : '';
    const hasTitle = title.length > 0;
    const hasDescription = description.length > 0;

    if (hasTitle && title.length > TITLE_MAX) {
        throw new ApiError(400, 'invalid_or_missing_title');
    }

    if (!input.allowEmpty) {
        if (!hasTitle) throw new ApiError(400, 'invalid_or_missing_title');
        if (!hasDescription) {
            throw new ApiError(400, 'invalid_or_missing_description');
        }
    } else if (hasTitle !== hasDescription) {
        throw new ApiError(400, 'incomplete_message_with_poll');
    }

    return { title, description };
}
