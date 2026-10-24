import { NextFunction, Response, Router } from 'express';

import { IController } from '../../../utils/icontroller';
import {
    ExtendedRequest,
    verifyStudentToken,
    verifyToken,
} from '../../../middlewares/mobileAuth';
import { faqService } from '../../faq/faq.service';
import type { FaqAudience } from '../../faq/types/faq.dto';

export class MobileFaqModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.get('/faq', verifyToken, this.listFor('parents'));
        this.router.get(
            '/student/faq',
            verifyStudentToken,
            this.listFor('students')
        );
    }

    listFor =
        (audience: FaqAudience) =>
        async (req: ExtendedRequest, res: Response, next: NextFunction) => {
            try {
                const result = await faqService.listForMobile(
                    req.user.school_id,
                    audience
                );

                // Admin edits must be visible immediately in the apps
                res.set('Cache-Control', 'no-store');
                return res.status(200).json(result).end();
            } catch (e: any) {
                return next(e);
            }
        };
}

export default MobileFaqModuleController;
