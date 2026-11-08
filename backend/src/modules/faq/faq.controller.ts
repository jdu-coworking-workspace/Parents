/**
 * FAQ Controller
 *
 * HTTP layer for FAQ management in the admin panel
 * Thin controller - delegates to service layer
 */

import { Router, Response, NextFunction } from 'express';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import { IController } from '../../utils/icontroller';
import { faqService } from './faq.service';
import { ApiError } from '../../errors/ApiError';
import {
    isValidAudience,
    isValidId,
    isValidString,
    parsePositiveInt,
} from '../../utils/validate';
import type { CreateFaqRequest, FaqAudience } from './types/faq.dto';

const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 10000;

function parseFaqBody(body: any): CreateFaqRequest {
    const { question, answer, audience, sort_order } = body ?? {};

    if (
        !isValidString(question) ||
        question.trim().length > MAX_QUESTION_LENGTH
    ) {
        throw new ApiError(400, 'invalid_question');
    }
    if (!isValidString(answer) || answer.trim().length > MAX_ANSWER_LENGTH) {
        throw new ApiError(400, 'invalid_answer');
    }
    if (!isValidAudience(audience)) {
        throw new ApiError(400, 'invalid_audience');
    }

    let sortOrder: number | undefined;
    if (sort_order !== undefined && sort_order !== null) {
        const parsed = Number(sort_order);
        if (!Number.isInteger(parsed) || parsed < 0) {
            throw new ApiError(400, 'invalid_sort_order');
        }
        sortOrder = parsed;
    }

    return {
        question: question.trim(),
        answer: answer.trim(),
        audience,
        sort_order: sortOrder,
    };
}

function parseFaqId(id: string): number {
    if (!isValidId(id)) {
        throw new ApiError(400, 'invalid_id');
    }
    return Number(id);
}

export class FaqModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.get('/list', verifyToken, this.listFaqs);
        this.router.post('/reorder', verifyToken, this.reorderFaqs);
        this.router.post('/create', verifyToken, this.createFaq);
        this.router.get('/:id', verifyToken, this.getFaq);
        this.router.put('/:id', verifyToken, this.updateFaq);
        this.router.delete('/:id', verifyToken, this.deleteFaq);
    }

    /**
     * GET /list?audience=parents|students - List FAQs
     */
    listFaqs = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { audience } = req.query;

            if (
                audience !== undefined &&
                !isValidAudience(audience as string)
            ) {
                throw new ApiError(400, 'invalid_audience');
            }

            const result = await faqService.listFaqs(
                req.user.school_id,
                audience as FaqAudience | undefined
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * GET /:id - Get FAQ
     */
    getFaq = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const id = parseFaqId(req.params.id);
            const result = await faqService.getFaq(id, req.user.school_id);

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * POST /create - Create FAQ
     */
    createFaq = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const request = parseFaqBody(req.body);
            const adminId = parsePositiveInt(req.user.id);

            const result = await faqService.createFaq(
                request,
                req.user.school_id,
                adminId
            );

            return res.status(201).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * PUT /:id - Update FAQ
     */
    updateFaq = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const id = parseFaqId(req.params.id);
            const request = parseFaqBody(req.body);

            const result = await faqService.updateFaq(
                id,
                request,
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * DELETE /:id - Delete FAQ
     */
    deleteFaq = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const id = parseFaqId(req.params.id);
            const result = await faqService.deleteFaq(id, req.user.school_id);

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * POST /reorder - Reorder FAQs of one audience
     * Body: { audience, ids: [id, ...] } in the desired order
     */
    reorderFaqs = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { audience, ids } = req.body ?? {};

            if (!isValidAudience(audience)) {
                throw new ApiError(400, 'invalid_audience');
            }
            if (
                !Array.isArray(ids) ||
                !ids.every(id => parsePositiveInt(id) !== null)
            ) {
                throw new ApiError(400, 'invalid_faq_ids');
            }

            const result = await faqService.reorderFaqs(
                { audience, ids: ids.map(Number) },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };
}

export default FaqModuleController;
