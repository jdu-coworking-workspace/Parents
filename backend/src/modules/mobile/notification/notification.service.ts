import { mobileNotificationRepository } from './notification.repository';
import { config } from '../../../config';

export class MobileNotificationService {
    async getStudentNotifications(studentId: number, page: number = 1) {
        return await mobileNotificationRepository.listStudentNotifications({
            studentId,
            page,
            limit: config.PER_PAGE,
        });
    }

    async markRead(postStudentId: number, studentId: number): Promise<boolean> {
        return await mobileNotificationRepository.markStudentNotificationRead({
            postStudentId,
            studentId,
        });
    }

    async savePushToken(studentId: number, token: string): Promise<void> {
        await mobileNotificationRepository.updateStudentPushToken({
            studentId,
            token,
        });
    }
}

export const mobileNotificationService = new MobileNotificationService();
