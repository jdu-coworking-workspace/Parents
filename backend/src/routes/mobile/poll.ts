import { Router } from 'express';

import mobilePollRouter from '../../modules/mobile/poll';
import { IController } from '../../utils/icontroller';

class PollController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', mobilePollRouter);
    }
}

export default PollController;
