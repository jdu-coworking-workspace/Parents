import { NextFunction, Response, Router } from 'express';
import { IController } from '../../../utils/icontroller';
import {
    verifyStudentToken,
    ExtendedStudentRequest,
} from '../../../middlewares/mobileStudentAuth';
import { mobileNotificationService } from './notification.service';
import { ApiError } from '../../../errors/ApiError';
import { isValidId } from '../../../utils/validate';

export class MobileNotificationController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.get(
            '/student/notifications',
            verifyStudentToken,
            this.studentNotifications
        );
        this.router.post(
            '/student/push-token',
            verifyStudentToken,
            this.studentPushToken
        );
        this.router.post(
            '/notifications/:id/read',
            verifyStudentToken,
            this.readNotification
        );
    }

    studentNotifications = async (
        req: ExtendedStudentRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const page = Math.max(
                1,
                parseInt((req.query.page as string) || '1')
            );
            const notifications =
                await mobileNotificationService.getStudentNotifications(
                    req.user.id,
                    page
                );

            return res.status(200).json({ notifications }).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    studentPushToken = async (
        req: ExtendedStudentRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { token } = req.body;
            if (
                !token ||
                typeof token !== 'string' ||
                token.trim().length < 10
            ) {
                throw new ApiError(400, 'invalid_or_missing_push_token');
            }

            await mobileNotificationService.savePushToken(
                req.user.id,
                token.trim()
            );
            return res.status(200).json({ message: 'Push token saved' }).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    readNotification = async (
        req: ExtendedStudentRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const notificationId = req.params.id;
            if (!notificationId || !isValidId(notificationId)) {
                throw new ApiError(400, 'invalid_or_missing_notification_id');
            }

            const updated = await mobileNotificationService.markRead(
                parseInt(notificationId, 10),
                req.user.id
            );

            if (!updated) {
                throw new ApiError(404, 'notification_not_found');
            }

            return res
                .status(200)
                .json({ message: 'Notification marked as read' })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };
}

export default MobileNotificationController;
