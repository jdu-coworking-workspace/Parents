/**
 * FAQ Repository
 *
 * Data access layer for Faq entity
 * Only SQL queries - no business logic
 */

import DB from '../../utils/db-client';
import type { FaqAudience } from './types/faq.dto';

// ==================== Interfaces ====================

export interface FaqRow {
    id: number;
    question: string;
    answer: string;
    audience: FaqAudience;
    sort_order: number;
    created_at: string;
    edited_at: string;
}

export interface CreateFaqData {
    question: string;
    answer: string;
    audience: FaqAudience;
    sort_order: number;
    school_id: number;
    admin_id: number | null;
}

export interface UpdateFaqData {
    id: number;
    school_id: number;
    question: string;
    answer: string;
    audience: FaqAudience;
    sort_order: number;
}

// ==================== Repository Class ====================

export class FaqRepository {
    /**
     * List FAQs of a school, optionally filtered by audience
     */
    async list(schoolId: number, audience?: FaqAudience): Promise<FaqRow[]> {
        const audienceFilter = audience ? 'AND audience = :audience' : '';

        return await DB.query(
            `SELECT id, question, answer, audience, sort_order,
                created_at, edited_at
            FROM Faq
            WHERE school_id = :school_id ${audienceFilter}
            ORDER BY audience, sort_order, id`,
            { school_id: schoolId, audience }
        );
    }

    /**
     * Find FAQ by ID within a school
     */
    async findById(id: number, schoolId: number): Promise<FaqRow | null> {
        const result = await DB.query(
            `SELECT id, question, answer, audience, sort_order,
                created_at, edited_at
            FROM Faq
            WHERE id = :id AND school_id = :school_id`,
            { id, school_id: schoolId }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Next sort_order value for appending to the end of an audience list
     */
    async getNextSortOrder(
        schoolId: number,
        audience: FaqAudience
    ): Promise<number> {
        const result = await DB.query(
            `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
            FROM Faq
            WHERE school_id = :school_id AND audience = :audience`,
            { school_id: schoolId, audience }
        );

        return Number(result[0]?.next_order ?? 1);
    }

    /**
     * Create FAQ
     */
    async create(data: CreateFaqData): Promise<number> {
        const result = await DB.execute(
            `INSERT INTO Faq (question, answer, audience, sort_order, school_id, admin_id)
            VALUES (:question, :answer, :audience, :sort_order, :school_id, :admin_id)`,
            data
        );

        return result.insertId;
    }

    /**
     * Update FAQ
     */
    async update(data: UpdateFaqData): Promise<void> {
        await DB.execute(
            `UPDATE Faq
            SET question = :question, answer = :answer,
                audience = :audience, sort_order = :sort_order
            WHERE id = :id AND school_id = :school_id`,
            data
        );
    }

    /**
     * Delete FAQ
     */
    async delete(id: number, schoolId: number): Promise<void> {
        await DB.execute(
            `DELETE FROM Faq WHERE id = :id AND school_id = :school_id`,
            { id, school_id: schoolId }
        );
    }

    /**
     * Set sort_order of the given FAQs according to their position in `ids`
     */
    async reorder(
        schoolId: number,
        audience: FaqAudience,
        ids: number[]
    ): Promise<void> {
        const connection = await DB.beginTransaction();
        try {
            for (let i = 0; i < ids.length; i++) {
                await DB.executeWithConnection(
                    connection,
                    `UPDATE Faq
                    SET sort_order = :sort_order
                    WHERE id = :id AND school_id = :school_id AND audience = :audience`,
                    {
                        id: ids[i],
                        sort_order: i + 1,
                        school_id: schoolId,
                        audience,
                    }
                );
            }
            await DB.commitTransaction(connection);
        } catch (e) {
            await DB.rollbackTransaction(connection);
            throw e;
        }
    }
}

export const faqRepository = new FaqRepository();
