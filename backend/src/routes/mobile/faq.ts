import { Router } from 'express';

import mobileFaqRouter from '../../modules/mobile/faq';
import { IController } from '../../utils/icontroller';

class FaqController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', mobileFaqRouter);
    }
}

export default FaqController;
