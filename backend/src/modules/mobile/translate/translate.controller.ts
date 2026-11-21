// In-app message translation for the parent app via Azure AI Translator.
// The Azure key stays on the backend; the mobile app only calls this endpoint.

import { NextFunction, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';

import { IController } from '../../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../../middlewares/mobileAuth';
import {
    SUPPORTED_TARGETS,
    TargetLanguage,
    TextType,
    translateTexts,
} from '../../../services/azure-translator.service';

// Azure bills per character, so cap what one request can cost.
const MAX_ITEMS = 5;
const MAX_TOTAL_CHARS = 10_000;

export class MobileTranslateModuleController implements IController {
    public router: Router = Router();

    private translateLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 20,
        message: { error: 'too_many_translate_requests' },
        standardHeaders: true,
        legacyHeaders: false,
    });

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.post(
            '/translate',
            this.translateLimiter,
            verifyToken,
            this.translate
        );
    }

    translate = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { texts, to, textType = 'plain' } = req.body ?? {};

            if (
                !Array.isArray(texts) ||
                texts.length === 0 ||
                texts.length > MAX_ITEMS ||
                !texts.every((t: unknown) => typeof t === 'string')
            ) {
                return res.status(400).json({ error: 'invalid_texts' });
            }
            if (!SUPPORTED_TARGETS.includes(to)) {
                return res.status(400).json({ error: 'invalid_target' });
            }
            if (textType !== 'plain' && textType !== 'html') {
                return res.status(400).json({ error: 'invalid_text_type' });
            }

            const totalChars = texts.reduce(
                (sum: number, t: string) => sum + t.length,
                0
            );
            if (totalChars === 0) {
                return res.status(400).json({ error: 'invalid_texts' });
            }
            if (totalChars > MAX_TOTAL_CHARS) {
                return res.status(413).json({ error: 'text_too_long' });
            }

            const translations = await translateTexts(
                texts,
                to as TargetLanguage,
                textType as TextType
            );

            return res.status(200).json({ to, translations });
        } catch (e: any) {
            if (e?.status === 503 || e?.status === 502) {
                console.error('[translate]', e.message, e.upstreamStatus ?? '');
                return res.status(e.status).json({ error: e.message });
            }
            return next(e);
        }
    };
}

export default MobileTranslateModuleController;
