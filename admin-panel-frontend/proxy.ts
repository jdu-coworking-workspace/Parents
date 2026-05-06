import { auth } from "@/auth";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { onlyAdminPathNameRegex, publicPathnameRegex } from "@/lib/routeAccess";

const intlMiddleware = createMiddleware(routing);
const SUPPORTED_LOCALES = ["en", "uz", "ja", "ru"] as const;

/**
 * Detects user's preferred language from multiple sources:
 * 1. NEXT_LOCALE cookie (user's saved preference)
 * 2. Accept-Language header (browser preference)
 * 3. Fallback to "en" (English)
 */
function detectLocaleFromRequest(
  req: NextRequest
): (typeof SUPPORTED_LOCALES)[number] {
  // Check for saved language preference
  const savedLocale = req.cookies.get("NEXT_LOCALE")?.value;
  if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale as any)) {
    return savedLocale as (typeof SUPPORTED_LOCALES)[number];
  }

  // Extract Accept-Language header
  const acceptLanguage = req.headers.get("accept-language") || "";

  // Parse Accept-Language header and match against supported locales
  const languages = acceptLanguage
    .split(",")
    .map((lang) => lang.split(";")[0].trim().toLowerCase());

  for (const lang of languages) {
    // Try direct match
    if (SUPPORTED_LOCALES.includes(lang as any)) {
      return lang as (typeof SUPPORTED_LOCALES)[number];
    }

    // Try language prefix match (e.g., "en-US" → "en")
    const langPrefix = lang.split("-")[0];
    if (SUPPORTED_LOCALES.includes(langPrefix as any)) {
      return langPrefix as (typeof SUPPORTED_LOCALES)[number];
    }
  }

  // Fallback to English
  return "en";
}

const authMiddleware = auth((req) => {
  const isAdminPath = onlyAdminPathNameRegex.test(req.nextUrl.pathname);
  let isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);

  const hasOAuthParams =
    req.nextUrl.searchParams.has("access_token") &&
    req.nextUrl.searchParams.has("user");
  if (hasOAuthParams) {
    const redirectUrl = new URL("/api/oauth/complete", req.nextUrl.origin);
    const paramsArray = Array.from(req.nextUrl.searchParams.entries());
    paramsArray.forEach(([k, v]) => redirectUrl.searchParams.set(k, v));
    return Response.redirect(redirectUrl);
  }

  if (!isPublicPage) {
    const path = req.nextUrl.pathname;
    if (
      path.startsWith("/parentnotification") ||
      routing.locales.some((locale) =>
        path.startsWith(`/${locale}/parentnotification`)
      )
    ) {
      isPublicPage = true;
    }
  }

  if (!req.auth && !isPublicPage) {
    const locale = req.nextUrl.locale || detectLocaleFromRequest(req);
    const newUrl = new URL(`/${locale}/login`, req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  if (
    req.auth &&
    (req.nextUrl.pathname.endsWith("/login") ||
      req.nextUrl.pathname.endsWith("/forgot-password"))
  ) {
    const locale = req.nextUrl.locale || detectLocaleFromRequest(req);
    const newUrl = new URL(`/${locale}`, req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  if (req.auth?.user?.role !== "admin" && isAdminPath) {
    const locale = req.nextUrl.locale || detectLocaleFromRequest(req);
    const newUrl = new URL(`/${locale}`, req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  // Set ACCEPT_LANGUAGE cookie for client-side detection
  const response = intlMiddleware(req);
  const acceptLanguage = req.headers.get("accept-language") || "";
  response.cookies.set("ACCEPT_LANGUAGE", acceptLanguage, {
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
  });

  return response;
});

export default function proxy(req: NextRequest) {
  return (authMiddleware as unknown as (req: NextRequest) => Response)(req);
}

export const config = {
  matcher: [
    "/((?!api|_next|.*\\..*).*)"
  ],
};
