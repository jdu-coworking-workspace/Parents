import { Router } from 'express';
import AuthController from './auth';
import FaqController from './faq';
import FormController from './form';
import ParentController from './parent';
import PostController from './post';
import StudentController from './student';
import { IController } from 'utils/icontroller';

console.log('starting Mobile');

class MobileController implements IController {
    public router: Router = Router();
    public path?: string | undefined = '/mobile';

    constructor() {
        this.initRoutes();
    }

    initRoutes() {
        this.router.use(new AuthController().router);
        this.router.use(new FormController().router);
        this.router.use(new ParentController().router);
        this.router.use(new PostController().router);
        this.router.use(new StudentController().router);
        this.router.use(new FaqController().router);
    }
}

export default MobileController;
