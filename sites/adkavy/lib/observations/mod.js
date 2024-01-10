import Kixx from '../../kixx/mod.js';
import ObservationsRPCTarget from './observations-rpc-target.js';
import ObservationsAddMediaTarget from './observations-add-media-target.js';

const { JsonRPCRoute } = Kixx.Routes;


export function registerObservations(components, router) {
    const { eventBus } = components;

    router.registerRouteFactory('ObservationsRPC', ({ patterns, targets }) => {
        return new JsonRPCRoute({
            eventBus,
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('ObservationsRPC', ({ methods, options }) => {
        return new ObservationsRPCTarget({
            eventBus,
            logger: components.logger.createChild({ name: 'ObservationsRPC' }),
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
