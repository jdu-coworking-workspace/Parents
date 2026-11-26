import { Linking } from 'react-native';
import type { Language } from '@/types/i18n';
import api, { ApiError } from '@/services/api-client';

// Google Translate rejects very long URLs, keep the encoded text under this size
const MAX_ENCODED_LENGTH = 8000;

const GOOGLE_LANGUAGE_CODES: Record<Language, string> = {
  en: 'en',
  ja: 'ja',
  uz: 'uz',
  ru: 'ru',
};

export function buildGoogleTranslateUrl(text: string, target: Language) {
  // Built by hand: React Native's URLSearchParams polyfill is incomplete
  const tl = GOOGLE_LANGUAGE_CODES[target] ?? 'en';
  return `https://translate.google.com/?sl=auto&tl=${tl}&text=${encodeLimited(text)}&op=translate`;
}

function encodeLimited(text: string) {
  // Iterate by code points so an emoji is never cut in half (would throw URIError)
  let encoded = '';
  for (const char of text) {
    const next = encodeURIComponent(char);
    if (encoded.length + next.length > MAX_ENCODED_LENGTH) break;
    encoded += next;
  }
  return encoded;
}

/**
 * Open Google Translate with the given text, translated into the app language.
 * On Android the Google Translate app handles this link if installed,
 * otherwise it opens in the browser.
 */
export async function openGoogleTranslate(text: string, target: Language) {
  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    await Linking.openURL(buildGoogleTranslateUrl(trimmed, target));
  } catch (error) {
    console.error('Failed to open Google Translate:', error);
  }
}

// ---------------------------------------------------------------------------
// In-app translation via backend → Azure AI Translator.
// Backend endpoint: POST /student/translate
// ---------------------------------------------------------------------------

interface TranslateResponse {
  to: Language;
  translations: { text: string; detectedLanguage?: string }[];
}

export interface TranslatedMessage {
  title: string;
  content: string;
  detectedLanguage?: string;
}

const looksLikeHtml = (text: string) => /<[a-z][\s\S]*>/i.test(text);

/**
 * Translate a message (title + body) inside the app.
 * Returns null when the backend has no Azure key (503) so the caller can
 * fall back to opening Google Translate.
 */
export async function translateMessageInApp(
  title: string,
  content: string,
  target: Language
): Promise<TranslatedMessage | null> {
  const isHtml = looksLikeHtml(content);
  const texts = [title || '', content || ''];

  try {
    // Title and body are sent as separate requests only when their
    // text types differ; Azure applies one textType per request.
    if (isHtml) {
      const [titleRes, contentRes] = await Promise.all([
        api.post<TranslateResponse>(
          '/student/translate',
          { texts: [texts[0] || ' '], to: target, textType: 'plain' },
          { timeout: 15000 }
        ),
        api.post<TranslateResponse>(
          '/student/translate',
          { texts: [texts[1] || ' '], to: target, textType: 'html' },
          { timeout: 15000 }
        ),
      ]);
      return {
        title: titleRes.data.translations[0]?.text ?? title,
        content: contentRes.data.translations[0]?.text ?? content,
        detectedLanguage: contentRes.data.translations[0]?.detectedLanguage,
      };
    }

    const res = await api.post<TranslateResponse>(
      '/student/translate',
      { texts: texts.map(t => t || ' '), to: target, textType: 'plain' },
      { timeout: 15000 }
    );
    return {
      title: res.data.translations[0]?.text ?? title,
      content: res.data.translations[1]?.text ?? content,
      detectedLanguage: res.data.translations[1]?.detectedLanguage,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) return null;
    throw error;
  }
}

export const SHOW_ORIGINAL_LABEL: Record<Language, string> = {
  en: 'Show original',
  ja: '原文を表示',
  uz: 'Asl matn',
  ru: 'Оригинал',
};
