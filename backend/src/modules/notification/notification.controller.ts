import { NextFunction, Response, Router } from 'express';
import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import { postService } from '../post/post.service';
import {
    isValidArrayId,
    isValidPriority,
    isValidString,
} from '../../utils/validate';
import { ApiError } from '../../errors/ApiError';

export class NotificationModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.post('/send-to-students', verifyToken, this.sendToStudents);
    }

    sendToStudents = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { title, description, priority, students, groups, image } =
                req.body;

            if (!title || !isValidString(title)) {
                throw new ApiError(400, 'invalid_or_missing_title');
            }
            if (!description || !isValidString(description)) {
                throw new ApiError(400, 'invalid_or_missing_description');
            }
            if (!priority || !isValidPriority(priority)) {
                throw new ApiError(400, 'invalid_or_missing_priority');
            }

            if (
                students &&
                (!Array.isArray(students) || !isValidArrayId(students))
            ) {
                throw new ApiError(400, 'invalid_student_list');
            }

            if (groups && (!Array.isArray(groups) || !isValidArrayId(groups))) {
                throw new ApiError(400, 'invalid_group_list');
            }

            const result = await postService.createPost(
                {
                    title,
                    description,
                    priority,
                    audience: 'students',
                    students,
                    groups,
                    image,
                },
                req.user.id,
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };
}

export default NotificationModuleController;
