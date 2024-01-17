import Kixx from '../../kixx/mod.js';
import ObjectManagementClient from '../object-management-client/object-management-client.js';
import ObservationsRPCTarget from './observations-rpc-target.js';
import ObservationsRemoteProcedureCalls from './observations-remote-procedure-calls.js';
import ObservationsAddMediaTarget from './observations-add-media-target.js';

const { JsonRPCRoute } = Kixx.Routes;


export function registerObservations(router, settings) {
    const {
        eventBus,
        logger,
        dataStore,
        objectServiceEndpoint,
        objectServiceScope,
        objectServiceToken,
    } = settings;

    router.registerRouteFactory('ObservationsRPC', ({ name, patterns, targets }) => {
        return new JsonRPCRoute({
            name,
            eventBus,
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('ObservationsRPC', ({ name, methods }) => {
        const remoteProcedureCalls = new ObservationsRemoteProcedureCalls({
            logger: logger.createChild({ name: 'ObservationsRemoteProcedureCalls' }),
            dataStore,
        });

        return new ObservationsRPCTarget({
            name,
            methods,
            eventBus,
            remoteProcedureCalls,
        });
    });

    router.registerTargetFactory('ObservationsAddMedia', ({ name, methods }) => {
        const objectManagementClient = new ObjectManagementClient({
            logger: logger.createChild({ name: 'ObjectManagementClient' }),
            objectServiceEndpoint,
            objectServiceScope,
            objectServiceToken,
        });

        return new ObservationsAddMediaTarget({
            name,
            methods,
            logger: logger.createChild({ name: 'ObservationsAddMedia' }),
            dataStore,
            objectManagementClient,
        });
    });
}
