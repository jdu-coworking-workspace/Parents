import express, { Router } from 'express';

import { IController } from '../../utils/icontroller';

import FaqModuleController from '../../modules/faq/faq.controller';

class FaqController implements IController {
    public router: Router = express.Router();
    private faqModule: FaqModuleController;

    constructor() {
        this.faqModule = new FaqModuleController();
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', this.faqModule.router);
    }
}

export default FaqController;
