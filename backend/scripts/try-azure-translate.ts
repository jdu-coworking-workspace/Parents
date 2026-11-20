// Manual check of Azure AI Translator with a real key.
//
// Usage (from backend/):
//   AZURE_TRANSLATOR_KEY=... AZURE_TRANSLATOR_REGION=japaneast \
//     npx tsx scripts/try-azure-translate.ts uz "明日は台風のため休校です。"
//
// Or put AZURE_TRANSLATOR_* into backend/.env and run:
//   npx tsx scripts/try-azure-translate.ts ja "Ertaga dars bo'lmaydi"

import dotenv from 'dotenv';
dotenv.config();

import {
    SUPPORTED_TARGETS,
    TargetLanguage,
    translateTexts,
} from '../src/services/azure-translator.service';

async function main() {
    const [to = 'uz', ...rest] = process.argv.slice(2);
    const text =
        rest.join(' ') ||
        '<p>保護者の皆様へ</p><p>明日は<b>台風</b>のため休校となります。</p>';

    if (!SUPPORTED_TARGETS.includes(to as TargetLanguage)) {
        console.error(`Target must be one of: ${SUPPORTED_TARGETS.join(', ')}`);
        process.exit(1);
    }

    const textType = /<[a-z][\s\S]*>/i.test(text) ? 'html' : 'plain';
    const started = Date.now();
    const [result] = await translateTexts(
        [text],
        to as TargetLanguage,
        textType
    );

    console.log({
        to,
        textType,
        ms: Date.now() - started,
        chars: text.length,
        detected: result.detectedLanguage,
        input: text,
        output: result.text,
    });
}

main().catch(e => {
    console.error(
        'FAILED:',
        e.message,
        e.upstreamStatus ?? '',
        e.upstreamCode ?? ''
    );
    process.exit(1);
});
