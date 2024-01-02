import StaticFileServerRoute from './static-file-server-route.js';
import StaticFileServerTarget from './static-file-server-target.js';


export function registerStaticFileServer(components, router) {
    const { eventBus } = components;
    const logger = components.logger.createChild({ name: 'StaticFileServer' });

    router.registerRouteFactory('StaticFileServer', ({ patterns, targets }) => {
        return new StaticFileServerRoute({
            eventBus,
            logger,
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('StaticFileServer', ({ methods, options }) => {
        return new StaticFileServerTarget({
            eventBus,
            logger,
            methods,
            options,
        });
    });
}
