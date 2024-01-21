import Kixx from '../../kixx/mod.js';
import ObjectManagementClient from '../object-management-client/object-management-client.js';
import ObservationsRPCTarget from './observations-rpc-target.js';
import ObservationsRemoteProcedureCalls from './observations-remote-procedure-calls.js';
import ObservationsAddMediaTarget from './observations-add-media-target.js';
import ListObservationsPage from './list-observations-page.js';

const { JsonRPCRoute } = Kixx.Routes;
const { HTMLPageTarget } = Kixx.Targets;


export function registerObservations(router, settings) {
    const {
        eventBus,
        logger,
        dataStore,
        blobStore,
        templateStore,
        objectServiceEndpoint,
        objectServiceScope,
        objectServiceToken,
        noCache,
    } = settings;

    dataStore.registerView({
        name: 'observations_by_observation_datetime',
        map(record, emit) {
            if (record.type === 'observation') {
                const dateTime = new Date(record.attributes.observationDateTime);
                emit(dateTime.toISOString(), null);
            }
        },
    });

    router.registerTargetFactory('ListObservations', ({ name, methods, options }) => {
        const page = new ListObservationsPage({
            pageId: options.page,
            templateId: options.template,
            noCache,
            logger: logger.createChild({ name: 'ListObservations' }),
            eventBus,
            dataStore,
            blobStore,
            templateStore,
            descending: options.descending,
            limit: options.limit,
        });

        return new HTMLPageTarget({
            name,
            methods,
            options,
            page,
        });
    });

    router.registerTargetFactory('ViewObservation', ({ name, methods, options }) => {
        const page = new ListObservationsPage({
            pageId: options.page,
            templateId: options.template,
            noCache,
            logger: logger.createChild({ name: 'ListObservations' }),
            eventBus,
            dataStore,
            blobStore,
            templateStore,
            descending: options.descending,
            limit: options.limit,
        });

        return new HTMLPageTarget({
            name,
            methods,
            options,
            page,
        });
    });

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
            dataStore,
            objectManagementClient,
        });
    });
}
