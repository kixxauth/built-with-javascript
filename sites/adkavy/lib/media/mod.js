import ObjectManagementClient from '../object-management-client/object-management-client.js';
import AddMediaTarget from './add-media-target.js';


export function registerMedia(router, settings) {
    const {
        logger,
        objectServiceEndpoint,
        objectServiceScope,
        objectServiceToken,
    } = settings;

    router.registerTargetFactory('AddMedia', ({ name, methods }) => {
        const objectManagementClient = new ObjectManagementClient({
            logger: logger.createChild({ name: 'ObjectManagementClient' }),
            objectServiceEndpoint,
            objectServiceScope,
            objectServiceToken,
        });

        return new AddMediaTarget({
            name,
            methods,
            objectManagementClient,
        });
    });
}
