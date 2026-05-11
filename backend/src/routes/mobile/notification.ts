import { Router } from 'express';
import mobileNotificationRouter from '../../modules/mobile/notification';
import { IController } from '../../utils/icontroller';

class NotificationController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', mobileNotificationRouter);
    }
}

export default NotificationController;
