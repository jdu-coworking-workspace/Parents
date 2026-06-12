import DB from '../../../utils/db-client';

export class MobileStudentPostRepository {
    async listPosts(params: {
        studentId: number;
        lastPostId: number;
        lastSentAt: string;
        limit: number;
    }): Promise<any[]> {
        if (params.lastPostId === 0) {
            return await DB.query(
                `SELECT ps.id,
                        po.title,
                        po.description                              AS content,
                        po.priority,
                        po.image,
                        DATE_FORMAT(po.sent_at, '%Y-%m-%d %H:%i')   AS sent_time,
                        DATE_FORMAT(ps.viewed_at, '%Y-%m-%d %H:%i') AS viewed_at,
                        DATE_FORMAT(po.edited_at, '%Y-%m-%d %H:%i') AS edited_at,
                        sg.name                                     AS group_name
                 FROM PostStudent AS ps
                          INNER JOIN Post AS po ON po.id = ps.post_id
                          LEFT JOIN StudentGroup AS sg ON sg.id = ps.group_id
                 WHERE ps.student_id = :student_id
                   AND po.audience = 'students'
                 ORDER BY po.sent_at DESC, ps.id DESC
                 LIMIT :limit`,
                {
                    student_id: params.studentId,
                    limit: params.limit,
                }
            );
        }

        return await DB.query(
            `SELECT ps.id,
                    po.title,
                    po.description                              AS content,
                    po.priority,
                    po.image,
                    DATE_FORMAT(po.sent_at, '%Y-%m-%d %H:%i')   AS sent_time,
                    DATE_FORMAT(ps.viewed_at, '%Y-%m-%d %H:%i') AS viewed_at,
                    DATE_FORMAT(po.edited_at, '%Y-%m-%d %H:%i') AS edited_at,
                    sg.name                                     AS group_name
             FROM PostStudent AS ps
                      INNER JOIN Post AS po ON po.id = ps.post_id
                      LEFT JOIN StudentGroup AS sg ON sg.id = ps.group_id
             WHERE ps.student_id = :student_id
               AND po.audience = 'students'
               AND (
                   po.sent_at < :last_sent_at OR
                   (po.sent_at = :last_sent_at AND ps.id < :last_post_id)
               )
             ORDER BY po.sent_at DESC, ps.id DESC
             LIMIT :limit`,
            {
                student_id: params.studentId,
                last_post_id: params.lastPostId,
                last_sent_at: params.lastSentAt,
                limit: params.limit,
            }
        );
    }

    async listUnreadPostStudentIds(params: {
        studentId: number;
        postIds: number[];
    }): Promise<any[]> {
        return await DB.query(
            `SELECT ps.id
             FROM PostStudent AS ps
             WHERE ps.student_id = :student_id
               AND ps.id IN (:post_ids)
               AND ps.viewed_at IS NULL`,
            {
                post_ids: params.postIds,
                student_id: params.studentId,
            }
        );
    }

    async markViewedByIds(postStudentIds: number[]): Promise<void> {
        const sanitizedIds = postStudentIds.filter(
            id => Number.isInteger(id) && id > 0
        );

        if (sanitizedIds.length === 0) return;

        await DB.execute(
            `UPDATE PostStudent
             SET viewed_at = NOW()
             WHERE id IN (:post_ids)`,
            { post_ids: sanitizedIds }
        );
    }

    async markViewedById(postStudentId: number): Promise<void> {
        await DB.execute(
            `UPDATE PostStudent
             SET viewed_at = NOW()
             WHERE id = :id`,
            { id: postStudentId }
        );
    }

    async findPostById(params: {
        postStudentId: string;
        studentId: number;
    }): Promise<any[]> {
        return await DB.query(
            `SELECT ps.id,
                    po.title,
                    po.description                              AS content,
                    po.priority,
                    po.image,
                    DATE_FORMAT(po.sent_at, '%Y-%m-%d %H:%i')   AS sent_time,
                    DATE_FORMAT(ps.viewed_at, '%Y-%m-%d %H:%i') AS viewed_at,
                    DATE_FORMAT(po.edited_at, '%Y-%m-%d %H:%i') AS edited_at,
                    sg.name                                     AS group_name
             FROM PostStudent AS ps
                      INNER JOIN Post AS po ON po.id = ps.post_id
                      LEFT JOIN StudentGroup AS sg ON sg.id = ps.group_id
             WHERE ps.id = :post_student_id
               AND ps.student_id = :student_id
               AND po.audience = 'students'
             LIMIT 1`,
            {
                post_student_id: params.postStudentId,
                student_id: params.studentId,
            }
        );
    }

    async findPostStudentForView(params: {
        postStudentId: number;
        studentId: number;
    }): Promise<any[]> {
        return await DB.query(
            `SELECT ps.id, ps.viewed_at
             FROM PostStudent AS ps
                      INNER JOIN Post AS po ON po.id = ps.post_id
             WHERE ps.id = :post_student_id
               AND ps.student_id = :student_id
               AND po.audience = 'students'`,
            {
                post_student_id: params.postStudentId,
                student_id: params.studentId,
            }
        );
    }

    async countUnread(studentId: number): Promise<number> {
        const result = await DB.query(
            `SELECT COUNT(*) AS unread_count
             FROM PostStudent AS ps
                      INNER JOIN Post AS po ON po.id = ps.post_id
             WHERE ps.student_id = :student_id
               AND po.audience = 'students'
               AND ps.viewed_at IS NULL`,
            { student_id: studentId }
        );

        return result[0]?.unread_count ?? 0;
    }
}

export const mobileStudentPostRepository = new MobileStudentPostRepository();
