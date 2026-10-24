/**
 * FAQ Service
 *
 * Business logic layer for FAQ operations
 * Coordinates repository calls, validates data, transforms responses
 */

import { faqRepository } from './faq.repository';
import { ApiError } from '../../errors/ApiError';
import type {
    FaqAudience,
    ListFaqsResponse,
    GetFaqResponse,
    CreateFaqRequest,
    CreateFaqResponse,
    UpdateFaqRequest,
    UpdateFaqResponse,
    DeleteFaqResponse,
    ReorderFaqsRequest,
    ReorderFaqsResponse,
    MobileFaqListResponse,
} from './types/faq.dto';

export class FaqService {
    /**
     * List FAQs of the admin's school
     */
    async listFaqs(
        schoolId: number,
        audience?: FaqAudience
    ): Promise<ListFaqsResponse> {
        const faqs = await faqRepository.list(schoolId, audience);
        return { faqs };
    }

    /**
     * Get single FAQ
     */
    async getFaq(id: number, schoolId: number): Promise<GetFaqResponse> {
        const faq = await faqRepository.findById(id, schoolId);

        if (!faq) {
            throw new ApiError(404, 'faq_not_found');
        }

        return { faq };
    }

    /**
     * Create FAQ. Appended to the end of the list when sort_order is omitted.
     */
    async createFaq(
        request: CreateFaqRequest,
        schoolId: number,
        adminId: number | null
    ): Promise<CreateFaqResponse> {
        const sortOrder =
            request.sort_order ??
            (await faqRepository.getNextSortOrder(schoolId, request.audience));

        const id = await faqRepository.create({
            question: request.question,
            answer: request.answer,
            audience: request.audience,
            sort_order: sortOrder,
            school_id: schoolId,
            admin_id: adminId,
        });

        return this.getFaq(id, schoolId);
    }

    /**
     * Update FAQ
     */
    async updateFaq(
        id: number,
        request: UpdateFaqRequest,
        schoolId: number
    ): Promise<UpdateFaqResponse> {
        const existing = await faqRepository.findById(id, schoolId);

        if (!existing) {
            throw new ApiError(404, 'faq_not_found');
        }

        let sortOrder = request.sort_order ?? existing.sort_order;
        if (
            request.sort_order === undefined &&
            request.audience !== existing.audience
        ) {
            sortOrder = await faqRepository.getNextSortOrder(
                schoolId,
                request.audience
            );
        }

        await faqRepository.update({
            id,
            school_id: schoolId,
            question: request.question,
            answer: request.answer,
            audience: request.audience,
            sort_order: sortOrder,
        });

        return this.getFaq(id, schoolId);
    }

    /**
     * Delete FAQ
     */
    async deleteFaq(id: number, schoolId: number): Promise<DeleteFaqResponse> {
        const existing = await faqRepository.findById(id, schoolId);

        if (!existing) {
            throw new ApiError(404, 'faq_not_found');
        }

        await faqRepository.delete(id, schoolId);

        return { message: 'faq_deleted' };
    }

    /**
     * Reorder FAQs of one audience. `ids` must contain every FAQ of that audience.
     */
    async reorderFaqs(
        request: ReorderFaqsRequest,
        schoolId: number
    ): Promise<ReorderFaqsResponse> {
        const current = await faqRepository.list(schoolId, request.audience);
        const currentIds = new Set(current.map(faq => faq.id));
        const requestedIds = new Set(request.ids);

        if (
            requestedIds.size !== request.ids.length ||
            requestedIds.size !== currentIds.size ||
            !request.ids.every(id => currentIds.has(id))
        ) {
            throw new ApiError(400, 'invalid_faq_ids');
        }

        await faqRepository.reorder(schoolId, request.audience, request.ids);

        const faqs = await faqRepository.list(schoolId, request.audience);
        return { faqs };
    }

    /**
     * FAQs shown in a mobile app (parents or students) of the given school
     */
    async listForMobile(
        schoolId: number,
        audience: FaqAudience
    ): Promise<MobileFaqListResponse> {
        const rows = await faqRepository.list(schoolId, audience);

        let updatedAt: string | null = null;
        const faqs = rows.map(row => {
            const editedAt = new Date(row.edited_at).toISOString();
            if (!updatedAt || editedAt > updatedAt) {
                updatedAt = editedAt;
            }
            return {
                id: row.id,
                question: row.question,
                answer: row.answer,
                sort_order: row.sort_order,
                edited_at: editedAt,
            };
        });

        return { faqs, updated_at: updatedAt };
    }
}

export const faqService = new FaqService();
