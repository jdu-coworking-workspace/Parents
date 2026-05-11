import DB from '../../../utils/db-client';

export class MobileNotificationRepository {
    async listStudentNotifications(params: {
        studentId: number;
        page: number;
        limit: number;
    }): Promise<any[]> {
        const offset = (params.page - 1) * params.limit;

        return await DB.query(
            `SELECT
                ps.id,
                po.id AS post_id,
                po.title,
                po.description AS content,
                po.priority,
                po.image,
                DATE_FORMAT(po.sent_at, '%Y-%m-%d %H:%i') AS sent_time,
                DATE_FORMAT(ps.viewed_at, '%Y-%m-%d %H:%i') AS viewed_at,
                DATE_FORMAT(po.edited_at, '%Y-%m-%d %H:%i') AS edited_at,
                sg.name AS group_name
             FROM PostStudent AS ps
             INNER JOIN Post AS po ON po.id = ps.post_id
             LEFT JOIN StudentGroup AS sg ON sg.id = ps.group_id
             WHERE ps.student_id = :student_id
               AND po.audience = 'students'
             ORDER BY po.sent_at DESC, ps.id DESC
             LIMIT :limit OFFSET :offset`,
            {
                student_id: params.studentId,
                limit: params.limit,
                offset,
            }
        );
    }

    async markStudentNotificationRead(params: {
        postStudentId: number;
        studentId: number;
    }): Promise<boolean> {
        const result = await DB.execute(
            `UPDATE PostStudent
             SET viewed_at = NOW()
             WHERE id = :id
               AND student_id = :student_id`,
            {
                id: params.postStudentId,
                student_id: params.studentId,
            }
        );

        return result.affectedRows > 0;
    }

    async updateStudentPushToken(params: {
        studentId: number;
        token: string;
    }): Promise<void> {
        await DB.execute(
            `UPDATE Student
             SET arn = :arn
             WHERE id = :id`,
            {
                id: params.studentId,
                arn: params.token,
            }
        );
    }
}

export const mobileNotificationRepository = new MobileNotificationRepository();
