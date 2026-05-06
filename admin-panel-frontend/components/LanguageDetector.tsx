"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "@/navigation";
import { useLocale } from "next-intl";

const SUPPORTED_LOCALES = ["en", "uz", "ja", "ru"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Detects browser language from Accept-Language header (via cookie) or navigator.language
 * and automatically switches the admin panel language if needed.
 *
 * Persists the user's language preference via NEXT_LOCALE cookie.
 */
export default function LanguageDetector() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as SupportedLocale;

  useEffect(() => {
    try {
      // Check if a language preference is already saved
      const savedLocale = getCookieValue("NEXT_LOCALE") as SupportedLocale | null;

      if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
        // Language preference already set, no action needed
        return;
      }

      // Detect browser language
      const detectedLocale = detectBrowserLanguage();

      if (detectedLocale && detectedLocale !== currentLocale) {
        // Save preference and redirect to detected language
        setLanguageCookie(detectedLocale);
        router.push(pathname, { locale: detectedLocale });
      } else if (detectedLocale && !savedLocale) {
        // Save the current locale preference even if it matches
        setLanguageCookie(currentLocale);
      }
    } catch (error) {
      console.warn("Failed to detect language:", error);
    }
  }, []);

  return null;
}

/**
 * Detects the user's preferred language from multiple sources
 * Priority: Accept-Language cookie (from server) > navigator.language > default
 */
function detectBrowserLanguage(): SupportedLocale | null {
  // Try to get Accept-Language from cookie (set by server on first request)
  const acceptLanguageCookie = getCookieValue("ACCEPT_LANGUAGE");
  if (acceptLanguageCookie) {
    const detected = matchLocale(acceptLanguageCookie);
    if (detected) return detected;
  }

  // Fallback to navigator.language on client side
  const navigatorLanguage = typeof navigator !== "undefined" ? navigator.language : null;
  if (navigatorLanguage) {
    const detected = matchLocale(navigatorLanguage);
    if (detected) return detected;
  }

  return null;
}

/**
 * Matches a language string (e.g., "en-US", "ja", "ru-RU") against supported locales
 */
function matchLocale(languageString: string): SupportedLocale | null {
  if (!languageString) return null;

  // Normalize: convert "en-US" to "en", "ru-RU" to "ru", etc.
  const normalized = languageString.split("-")[0].toLowerCase();

  // Direct match
  if (SUPPORTED_LOCALES.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }

  // Fallback: check for language prefix (e.g., "en-GB" matches "en")
  for (const locale of SUPPORTED_LOCALES) {
    if (normalized.startsWith(locale)) {
      return locale;
    }
  }

  return null;
}

/**
 * Gets a cookie value by name
 */
function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];

  return cookie || null;
}

/**
 * Sets the language preference cookie with 1-year expiry
 */
function setLanguageCookie(locale: SupportedLocale): void {
  if (typeof document === "undefined") return;

  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${
    365 * 24 * 60 * 60
  }; samesite=lax`;
}
