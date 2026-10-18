/**
 * FAQ Module - Data Transfer Objects (DTOs)
 *
 * Request/Response type definitions for FAQ endpoints
 */

// ==================== Common Types ====================

export type FaqAudience = 'parents' | 'students';

export interface FaqData {
    id: number;
    question: string;
    answer: string;
    audience: FaqAudience;
    sort_order: number;
    created_at: string;
    edited_at: string;
}

export interface MobileFaqData {
    id: number;
    question: string;
    answer: string;
    sort_order: number;
    edited_at: string;
}

// ==================== GET /list - List FAQs (admin) ====================

export interface ListFaqsResponse {
    faqs: FaqData[];
}

// ==================== GET /:id - Get FAQ (admin) ====================

export interface GetFaqResponse {
    faq: FaqData;
}

// ==================== POST /create - Create FAQ (admin) ====================

export interface CreateFaqRequest {
    question: string;
    answer: string;
    audience: FaqAudience;
    sort_order?: number;
}

export interface CreateFaqResponse {
    faq: FaqData;
}

// ==================== PUT /:id - Update FAQ (admin) ====================

export interface UpdateFaqRequest {
    question: string;
    answer: string;
    audience: FaqAudience;
    sort_order?: number;
}

export interface UpdateFaqResponse {
    faq: FaqData;
}

// ==================== DELETE /:id - Delete FAQ (admin) ====================

export interface DeleteFaqResponse {
    message: string;
}

// ==================== POST /reorder - Reorder FAQs (admin) ====================

export interface ReorderFaqsRequest {
    audience: FaqAudience;
    ids: number[];
}

export interface ReorderFaqsResponse {
    faqs: FaqData[];
}

// ==================== Mobile GET /faq, /student/faq ====================

export interface MobileFaqListResponse {
    faqs: MobileFaqData[];
    updated_at: string | null;
}
