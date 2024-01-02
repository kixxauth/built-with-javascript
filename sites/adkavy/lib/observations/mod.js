import ObservationsRPCTarget from './observations-rpc-target.js';
import ObservationsRPCRoute from './observations-rpc-route.js';
import ObservationsAddMediaTarget from './observations-add-media-target.js';

export function registerObservations(components, router) {
    const { eventBus } = components;

    const jsonRPCLogger = components.logger.createChild({ name: 'ObservationsRPC' });

    router.registerRouteFactory('ObservationsRPC', ({ patterns, targets }) => {
        return new ObservationsRPCRoute({
            eventBus,
            logger: jsonRPCLogger,
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('ObservationsRPC', ({ methods, options }) => {
        return new ObservationsRPCTarget({
            eventBus,
            logger: jsonRPCLogger,
            methods,
            options,
        });
    });

    router.registerTargetFactory('ObservationsAddMedia', ({ methods, options }) => {
        return new ObservationsAddMediaTarget({
            eventBus,
            logger: components.logger.createChild({ name: 'ObservationsAddMediaTarget' }),
            methods,
            options,
        });
    });
}
