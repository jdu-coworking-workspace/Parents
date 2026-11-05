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
        // Ota-ona
        this.router.post('/poll/vote', verifyToken, this.parentVote);
        this.router.delete(
            '/poll/vote/:post_id',
            verifyToken,
            this.parentRemoveVote
        );

        // O'quvchi
        this.router.post(
            '/student/poll/vote',
            verifyStudentToken,
            this.studentVote
        );
        this.router.delete(
            '/student/poll/vote/:post_id',
            verifyStudentToken,
            this.studentRemoveVote
        );
    }

    private parseVoteBody(req: ExtendedRequest) {
        const postId = parsePositiveInt(req.body?.post_id);
        const optionId = parsePositiveInt(req.body?.option_id);
        if (!postId || !optionId) {
            throw new ApiError(400, 'invalid_poll_vote');
        }
        return { postId, optionId };
    }

    private parsePostIdParam(req: ExtendedRequest) {
        const postId = parsePositiveInt(req.params?.post_id);
        if (!postId) {
            throw new ApiError(400, 'invalid_poll_vote');
        }
        return postId;
    }

    parentVote = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { postId, optionId } = this.parseVoteBody(req);
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

    parentRemoveVote = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const postId = this.parsePostIdParam(req);
            const pollId = req.query?.poll_id
                ? (parsePositiveInt(req.query.poll_id) ?? undefined)
                : undefined;
            const result = await pollService.removeVote({
                postId,
                pollId,
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
            const { postId, optionId } = this.parseVoteBody(req);
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

    studentRemoveVote = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const postId = this.parsePostIdParam(req);
            const pollId = req.query?.poll_id
                ? (parsePositiveInt(req.query.poll_id) ?? undefined)
                : undefined;
            const result = await pollService.removeVote({
                postId,
                pollId,
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