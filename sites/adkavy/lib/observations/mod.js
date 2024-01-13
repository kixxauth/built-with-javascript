import Kixx from '../../kixx/mod.js';
import ObservationsRPCTarget from './observations-rpc-target.js';
import ObservationsRemoteProcedureCalls from './observations-remote-procedure-calls.js';
import ObservationsAddMediaTarget from './observations-add-media-target.js';

const { JsonRPCRoute } = Kixx.Routes;


export function registerObservations(router, settings) {
    const { eventBus, logger } = settings;

    router.registerRouteFactory('ObservationsRPC', ({ name, patterns, targets }) => {
        return new JsonRPCRoute({
            name,
            eventBus,
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('ObservationsRPC', ({ name, methods }) => {
        const remoteProcedureCalls = new ObservationsRemoteProcedureCalls();

        return new ObservationsRPCTarget({
            name,
            methods,
            remoteProcedureCalls,
        });
    });

    router.registerTargetFactory('ObservationsAddMedia', ({ name, methods, options }) => {
        return new ObservationsAddMediaTarget({
            name,
            eventBus,
            logger: logger.createChild({ name: 'ObservationsAddMediaTarget' }),
            methods,
            options,
        });
    });
}
