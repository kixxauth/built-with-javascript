import Kixx from '../../kixx/mod.js';
import ObservationsRPCTarget from './observations-rpc-target.js';
import ObservationsRemoteProcedureCalls from './observations-remote-procedure-calls.js';
import ObservationsAddMediaTarget from './observations-add-media-target.js';

const { JsonRPCRoute } = Kixx.Routes;


export function registerObservations(components, router) {
    const { eventBus, logger } = components;

    router.registerRouteFactory('ObservationsRPC', ({ patterns, targets }) => {
        return new JsonRPCRoute({
            eventBus,
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('ObservationsRPC', ({ methods }) => {
        const remoteProcedureCalls = new ObservationsRemoteProcedureCalls();
        return new ObservationsRPCTarget({
            methods,
            remoteProcedureCalls,
        });
    });

    router.registerTargetFactory('ObservationsAddMedia', ({ methods, options }) => {
        return new ObservationsAddMediaTarget({
            eventBus,
            logger: logger.createChild({ name: 'ObservationsAddMediaTarget' }),
            methods,
            options,
        });
    });
}
