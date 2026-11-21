import { Router } from 'express';

import mobileTranslateRouter from '../../modules/mobile/translate';
import { IController } from '../../utils/icontroller';

class TranslateController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', mobileTranslateRouter);
    }
}

export default TranslateController;
