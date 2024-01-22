import path from 'node:path';
import { KixxAssert } from '../../dependencies.js';
import StaticFileServerRoute from './static-file-server-route.js';
import StaticFileServerTarget from './static-file-server-target.js';

const { isNonEmptyString } = KixxAssert;


export function registerStaticFileServer(router, settings) {
    const {
        eventBus,
        logger,
        publicDirectory,
        cacheOff,
    } = settings;

    router.registerRouteFactory('StaticFileServer', ({ name, patterns, targets }) => {
        return new StaticFileServerRoute({
            name,
            eventBus,
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('StaticFileServer', ({ name, methods, options }) => {

        const { folder, cacheControl } = options;

        let rootPath = publicDirectory;

        if (isNonEmptyString(folder)) {
            const pathParts = folder.split('/').filter((x) => x);

            // Use the provided folder name.
            rootPath = path.join(publicDirectory, ...pathParts);
        }

        return new StaticFileServerTarget({
            name,
            logger: logger.createChild({ name: 'StaticFileServer' }),
            methods,
            rootPath,
            cacheControl,
            cacheOff,
        });
    });
}
