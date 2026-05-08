import AdminPanelController from './routes/admin-panel';
import MobileController from './routes/mobile';
import App from './utils/app';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { config } from './config';
import { verifyToken, ExtendedRequest } from './middlewares/auth';

export default function createApp() {
    const app = new App([new AdminPanelController(), new MobileController()]);

    // Debug: log registered routes and config at startup to help diagnose
    try {
        // list express routes
        // @ts-ignore access internal stack for debugging
        const stack = (app as any).app._router?.stack || [];
        const routes: string[] = [];
        stack.forEach((layer: any) => {
            if (layer.route && layer.route.path) {
                routes.push(layer.route.path);
            } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
                layer.handle.stack.forEach((l: any) => {
                    if (l.route && l.route.path) routes.push(l.route.path);
                });
            }
        });
        console.log('[Startup] Registered routes:', JSON.stringify(routes));
    } catch (e) {
        console.warn('[Startup] Failed to list routes', e);
    }

    // Test-only endpoint for smoke tests (no DB dependency).
    // Guarded by NODE_ENV=test inside verifyToken via x-test-auth header.
    if (config.NODE_ENV === 'test') {
        app.app.get(
            '/__test/protected',
            verifyToken,
            (req: ExtendedRequest, res) => {
                res.status(200).json({ ok: true, user: req.user ?? null });
            }
        );
    }

    // Register error handlers AFTER all routes
    app.app.use(notFoundHandler);
    app.app.use(errorHandler);

    return app.app;
}
