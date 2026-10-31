import { Linking } from 'react-native';
import type { Language } from '@/types/i18n';

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
