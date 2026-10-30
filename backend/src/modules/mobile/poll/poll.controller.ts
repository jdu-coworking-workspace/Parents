import { NextFunction, Response, Router } from 'express';

import { IController } from '../../../utils/icontroller';
import {
    ExtendedRequest,
    verifyStudentToken,
    verifyToken,
} from '../../../middlewares/mobileAuth';
import { pollService } from '../../poll/poll.service';
import { ApiError } from '../../../errors/ApiError';
import { parsePositiveInt } from '../../../utils/validate';

export class MobilePollModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.post('/poll/vote', verifyToken, this.parentVote);
        this.router.post(
            '/student/poll/vote',
            verifyStudentToken,
            this.studentVote
        );
    }

    private parseBody(req: ExtendedRequest) {
        const postId = parsePositiveInt(req.body?.post_id);
        const optionId = parsePositiveInt(req.body?.option_id);
        if (!postId || !optionId) {
            throw new ApiError(400, 'invalid_poll_vote');
        }
        return { postId, optionId };
    }

    parentVote = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { postId, optionId } = this.parseBody(req);
            const result = await pollService.vote({
                postId,
                optionId,
                voterType: 'parent',
                voterId: req.user.id,
            });
            return res.status(200).json(result).end();
        } catch (e: any) {
            return next(e);
        }
    };

    studentVote = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { postId, optionId } = this.parseBody(req);
            const result = await pollService.vote({
                postId,
                optionId,
                voterType: 'student',
                voterId: req.user.id,
            });
            return res.status(200).json(result).end();
        } catch (e: any) {
            return next(e);
        }
    };
}

export default MobilePollModuleController;
