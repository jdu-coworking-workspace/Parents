// Azure AI Translator (Text Translation REST API v3.0)
// Docs: https://learn.microsoft.com/azure/ai-services/translator/reference/v3-0-translate
//
// Env vars are read lazily and are OPTIONAL, so existing deployments
// without Azure config keep working (the endpoint just returns 503).

export const SUPPORTED_TARGETS = ['en', 'ja', 'uz', 'ru'] as const;
export type TargetLanguage = (typeof SUPPORTED_TARGETS)[number];
export type TextType = 'plain' | 'html';

export interface TranslationResult {
    text: string;
    detectedLanguage?: string;
    detectedScore?: number;
}

export class TranslatorNotConfiguredError extends Error {
    status = 503;
    constructor() {
        super('translator_not_configured');
    }
}

export class TranslatorUpstreamError extends Error {
    status = 502;
    constructor(
        message: string,
        public upstreamStatus?: number,
        public upstreamCode?: number
    ) {
        super(message);
    }
}

const DEFAULT_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

function getAzureConfig() {
    const key = process.env.AZURE_TRANSLATOR_KEY;
    if (!key) return null;
    return {
        key,
        // Required for regional / multi-service resources (e.g. "japaneast")
        region: process.env.AZURE_TRANSLATOR_REGION,
        endpoint: (
            process.env.AZURE_TRANSLATOR_ENDPOINT || DEFAULT_ENDPOINT
        ).replace(/\/+$/, ''),
    };
}

export function isTranslatorConfigured(): boolean {
    return getAzureConfig() !== null;
}

export async function translateTexts(
    texts: string[],
    to: TargetLanguage,
    textType: TextType = 'plain',
    timeoutMs = 10_000
): Promise<TranslationResult[]> {
    const cfg = getAzureConfig();
    if (!cfg) throw new TranslatorNotConfiguredError();

    // Built by hand to keep the query explicit (from is omitted → auto-detect)
    const url =
        `${cfg.endpoint}/translate?api-version=3.0` +
        `&to=${encodeURIComponent(to)}` +
        `&textType=${textType}`;

    const headers: Record<string, string> = {
        'Ocp-Apim-Subscription-Key': cfg.key,
        'Content-Type': 'application/json; charset=UTF-8',
    };
    if (cfg.region) headers['Ocp-Apim-Subscription-Region'] = cfg.region;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(texts.map(text => ({ Text: text }))),
            signal: controller.signal,
        });
    } catch (e: any) {
        throw new TranslatorUpstreamError(
            e?.name === 'AbortError'
                ? 'translator_timeout'
                : 'translator_network_error'
        );
    } finally {
        clearTimeout(timer);
    }

    const body: any = await response.json().catch(() => null);

    if (!response.ok) {
        // Azure error shape: { error: { code: 401000, message: "..." } }
        throw new TranslatorUpstreamError(
            body?.error?.message || 'translator_upstream_error',
            response.status,
            body?.error?.code
        );
    }

    if (!Array.isArray(body)) {
        throw new TranslatorUpstreamError('translator_bad_response');
    }

    return body.map((item: any) => ({
        text: item?.translations?.[0]?.text ?? '',
        detectedLanguage: item?.detectedLanguage?.language,
        detectedScore: item?.detectedLanguage?.score,
    }));
}
