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
    option_id: number;
    option_text: string;
    position: number;
    votes: number;
}

export class PollRepository {
    /**
     * Poll va uning variantlarini yaratish
     */
    async create(postId: number, options: string[]): Promise<number> {
        const result = await DB.execute(
            'INSERT INTO Poll (post_id) VALUES (:post_id)',
            { post_id: postId }
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
                    po.id AS option_id,
                    po.option_text,
                    po.position,
                    COUNT(pv.id) AS votes
             FROM Poll p
             INNER JOIN PollOption po ON po.poll_id = p.id
             LEFT JOIN PollVote pv ON pv.option_id = po.id
             WHERE p.post_id IN (:postIds)
             GROUP BY p.id, p.post_id, po.id, po.option_text, po.position
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
    ): Promise<Array<{ post_id: number; option_id: number }>> {
        if (postIds.length === 0) return [];

        return await DB.query(
            `SELECT p.post_id, pv.option_id
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
     * Ovoz qo'shish. Allaqachon ovoz bergan bo'lsa false qaytaradi.
     */
    async insertVote(data: {
        poll_id: number;
        option_id: number;
        voter_type: VoterType;
        voter_id: number;
    }): Promise<boolean> {
        const result = await DB.execute(
            `INSERT IGNORE INTO PollVote (poll_id, option_id, voter_type, voter_id)
             VALUES (:poll_id, :option_id, :voter_type, :voter_id)`,
            data
        );
        return result.affectedRows > 0;
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
}

export const pollRepository = new PollRepository();
