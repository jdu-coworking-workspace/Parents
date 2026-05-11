import { Router } from 'express';
import notificationRouter from '../../modules/notification';
import { IController } from '../../utils/icontroller';

class NotificationController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', notificationRouter);
    }
}

export default NotificationController;
