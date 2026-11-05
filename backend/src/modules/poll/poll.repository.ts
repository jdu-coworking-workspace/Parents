/**
 * Poll Repository
 *
 * Data access layer for Poll, PollOption, PollVote
 * Only SQL queries - no business logic
 */

import DB from '../../utils/db-client';

export type VoterType = 'parent' | 'student';

export interface PollOptionRow {
    poll_id: number;
    post_id: number;
    question?: string | null;
    option_id: number;
    option_text: string;
    position: number;
    votes: number;
}

export interface PollVoterRow {
    poll_id: number;
    option_id: number;
    voter_type: VoterType;
    voter_id: number;
    given_name: string;
    family_name: string;
    email: string | null;
    student_number: string | null;
    created_at: string;
}

export class PollRepository {
    /**
     * Poll va uning variantlarini yaratish
     */
    async create(
        postId: number,
        options: string[],
        question?: string | null
    ): Promise<number> {
        const result = await DB.execute(
            'INSERT INTO Poll (post_id, question) VALUES (:post_id, :question)',
            { post_id: postId, question: question || null }
        );
        const pollId = result.insertId;

        for (let i = 0; i < options.length; i++) {
            await DB.execute(
                `INSERT INTO PollOption (poll_id, option_text, position)
                 VALUES (:poll_id, :option_text, :position)`,
                { poll_id: pollId, option_text: options[i], position: i }
            );
        }

        return pollId;
    }

    /**
     * Postlar uchun variantlar va ovoz sonlari
     */
    async findResultsByPostIds(postIds: number[]): Promise<PollOptionRow[]> {
        if (postIds.length === 0) return [];

        return await DB.query(
            `SELECT p.id AS poll_id,
                    p.post_id,
                    p.question,
                    po.id AS option_id,
                    po.option_text,
                    po.position,
                    COUNT(pv.id) AS votes
             FROM Poll p
             INNER JOIN PollOption po ON po.poll_id = p.id
             LEFT JOIN PollVote pv ON pv.option_id = po.id
             WHERE p.post_id IN (:postIds)
             GROUP BY p.id, p.post_id, p.question, po.id, po.option_text, po.position
             ORDER BY p.id, po.position`,
            { postIds }
        );
    }

    /**
     * Foydalanuvchi bergan ovozlar (post_id -> option_id)
     */
    async findVotesByVoter(
        postIds: number[],
        voterType: VoterType,
        voterId: number
    ): Promise<Array<{ poll_id: number; post_id: number; option_id: number }>> {
        if (postIds.length === 0) return [];

        return await DB.query(
            `SELECT p.id AS poll_id, p.post_id, pv.option_id
             FROM PollVote pv
             INNER JOIN Poll p ON p.id = pv.poll_id
             WHERE p.post_id IN (:postIds)
               AND pv.voter_type = :voter_type
               AND pv.voter_id = :voter_id`,
            { postIds, voter_type: voterType, voter_id: voterId }
        );
    }

    /**
     * Variant shu postning pollga tegishlimi
     */
    async findOption(
        postId: number,
        optionId: number
    ): Promise<{ poll_id: number } | null> {
        const rows = await DB.query(
            `SELECT p.id AS poll_id
             FROM Poll p
             INNER JOIN PollOption po ON po.poll_id = p.id
             WHERE p.post_id = :post_id AND po.id = :option_id`,
            { post_id: postId, option_id: optionId }
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Ovoz berish yoki almashtirish.
     * Foydalanuvchi allaqachon ovoz bergan bo'lsa, variant yangilanadi.
     * (UNIQUE KEY poll_id + voter_type + voter_id ga tayanadi)
     */
    async upsertVote(data: {
        poll_id: number;
        option_id: number;
        voter_type: VoterType;
        voter_id: number;
    }): Promise<void> {
        await DB.execute(
            `INSERT INTO PollVote (poll_id, option_id, voter_type, voter_id)
             VALUES (:poll_id, :option_id, :voter_type, :voter_id)
             ON DUPLICATE KEY UPDATE option_id = :option_id, created_at = NOW()`,
            data
        );
    }

    /**
     * Foydalanuvchining ovozini olib tashlash
     */
    async deleteVote(
        postId: number,
        voterType: VoterType,
        voterId: number,
        pollId?: number
    ): Promise<void> {
        if (pollId) {
            await DB.execute(
                `DELETE FROM PollVote
                 WHERE voter_type = :voter_type
                   AND voter_id = :voter_id
                   AND poll_id = :poll_id`,
                { poll_id: pollId, voter_type: voterType, voter_id: voterId }
            );
        } else {
            await DB.execute(
                `DELETE FROM PollVote
                 WHERE voter_type = :voter_type
                   AND voter_id = :voter_id
                   AND poll_id IN (SELECT id FROM Poll WHERE post_id = :post_id)`,
                { post_id: postId, voter_type: voterType, voter_id: voterId }
            );
        }
    }

    /**
     * Ota-onaga post yuborilganmi
     */
    async parentHasPost(postId: number, parentId: number): Promise<boolean> {
        const rows = await DB.query(
            `SELECT pp.id
             FROM PostParent pp
             INNER JOIN PostStudent ps ON ps.id = pp.post_student_id
             WHERE ps.post_id = :post_id AND pp.parent_id = :parent_id
             LIMIT 1`,
            { post_id: postId, parent_id: parentId }
        );
        return rows.length > 0;
    }

    /**
     * O'quvchiga post yuborilganmi
     */
    async studentHasPost(postId: number, studentId: number): Promise<boolean> {
        const rows = await DB.query(
            `SELECT ps.id
             FROM PostStudent ps
             INNER JOIN Post po ON po.id = ps.post_id
             WHERE ps.post_id = :post_id
               AND ps.student_id = :student_id
               AND po.audience = 'students'
             LIMIT 1`,
            { post_id: postId, student_id: studentId }
        );
        return rows.length > 0;
    }

    /**
     * Post bo'yicha barcha ovoz beruvchilarni olish
     */
    async findVotersByPostId(postId: number): Promise<PollVoterRow[]> {
        const rows = await DB.query(
            `SELECT 
                pv.poll_id,
                pv.option_id,
                pv.voter_type,
                pv.voter_id,
                COALESCE(s.given_name, p.given_name, '') AS given_name,
                COALESCE(s.family_name, p.family_name, '') AS family_name,
                COALESCE(s.email, p.email, NULL) AS email,
                s.student_number,
                pv.created_at
             FROM PollVote pv
             JOIN Poll po ON po.id = pv.poll_id
             LEFT JOIN Student s ON pv.voter_type = 'student' AND s.id = pv.voter_id
             LEFT JOIN Parent p ON pv.voter_type = 'parent' AND p.id = pv.voter_id
             WHERE po.post_id = :post_id
             ORDER BY pv.created_at DESC`,
            { post_id: postId }
        );
        return rows as PollVoterRow[];
    }
}

export const pollRepository = new PollRepository();