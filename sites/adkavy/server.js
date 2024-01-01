import path from 'node:path';
import http from 'node:http';
import util from 'node:util';
import { EventEmitter } from 'node:events';
import Kixx from './kixx/mod.js';
import ConfigManager from './lib/config-manager/config-manager.js';

import StaticFileServerRoute from './lib/http-routes/static-file-server.js';
import HTMLPageRoute from './lib/http-routes/html-page.js';
import JsonRPCRoute from './lib/http-routes/json-rpc.js';

import StaticFileServerTarget from './lib/http-targets/static-file-server.js';
import HTMLPageTarget from './lib/http-targets/html-page.js';
import ListEntitiesTarget from './lib/http-targets/list-entities.js';
import ViewEntityTarget from './lib/http-targets/view-entity.js';

import ObservationsRPCTarget from './lib/http-targets/observations-rpc.js';
import ObservationsAddMediaTarget from './lib/http-targets/observations-add-media.js';

import { createLogger } from './lib/logger.js';
import { fromFileUrl } from './lib/utils.js';

import routes from './seeds/routes.js';


const { NodeHTTPRouter, Route } = Kixx.HTTP;


const NAME = 'adkavy';
const ROOT_DIR = fromFileUrl(new URL('./', import.meta.url));

const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];


async function main() {

    const args = util.parseArgs({
        options: {
            environment: {
                type: 'string',
                short: 'e',
                default: 'development',
            },
        },
    });

    const { environment } = args.values;

    if (!ALLOWED_ENVIRONMENTS.includes(environment)) {
        throw new Error(`Invalid environment argument: "${ environment }"`);
    }

    const configManager = new ConfigManager({
        rootConfigDir: path.join(ROOT_DIR, 'config'),
    });

    const config = await configManager.load(environment);

    // Uncomment to debug config
    // console.log(JSON.stringify(config, null, 4));

    const logger = createLogger({
        name: NAME,
        level: config.logger.level,
        makePretty: config.logger.makePretty,
    });

    const eventBus = new EventEmitter();

    eventBus.on('error', (error) => {
        logger.fatal('fatal error emitted on event bus', { error });
        logger.fatal('will attempt shutdown');
        gracefullyExit();
    });

    const router = new NodeHTTPRouter({
        logger: logger.createChild({ name: 'HTTPRouter' }),
        eventBus,
    });

    router.registerRouteFactory('DefaultRoute', ({ patterns, targets }) => {
        return new Route({
            eventBus,
            patterns,
            targets,
        });
    });

    router.registerRouteFactory('StaticFileServer', ({ patterns, targets }) => {
        return new StaticFileServerRoute({
            eventBus,
            logger: logger.createChild({ name: 'StaticFileServerRoute' }),
            patterns,
            targets,
        });
    });

    router.registerRouteFactory('HTMLPage', ({ patterns, targets }) => {
        return new HTMLPageRoute({
            eventBus,
            logger: logger.createChild({ name: 'HTMLPageRoute' }),
            patterns,
            targets,
        });
    });

    router.registerRouteFactory('JsonRPC', ({ patterns, targets }) => {
        return new JsonRPCRoute({
            eventBus,
            logger: logger.createChild({ name: 'JsonRPCRoute' }),
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('StaticFileServer', ({ methods, options }) => {
        return new StaticFileServerTarget({
            eventBus,
            logger: logger.createChild({ name: 'StaticFileServerTarget' }),
            methods,
            options,
        });
    });

    router.registerTargetFactory('HTMLPage', ({ methods, options }) => {
        return new HTMLPageTarget({
            eventBus,
            logger: logger.createChild({ name: 'HTMLPageTarget' }),
            methods,
            options,
        });
    });

    router.registerTargetFactory('ListEntities', ({ methods, options }) => {
        return new ListEntitiesTarget({
            eventBus,
            logger: logger.createChild({ name: 'ListEntitiesTarget' }),
            methods,
            options,
        });
    });

    router.registerTargetFactory('ViewEntity', ({ methods, options }) => {
        return new ViewEntityTarget({
            eventBus,
            logger: logger.createChild({ name: 'ViewEntityTarget' }),
            methods,
            options,
        });
    });

    router.registerTargetFactory('ObservationsRPC', ({ methods, options }) => {
        return new ObservationsRPCTarget({
            eventBus,
            logger: logger.createChild({ name: 'ObservationsRPCTarget' }),
            methods,
            options,
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

    for (const routeSpec of routes) {
        router.registerRoute(routeSpec);
    }

    const server = http.createServer((req, res) => {

        req.on('error', (error) => {
            logger.warn('request error event', { name: error.name, code: error.code, message: error.message });
        });

        router.handleRequest(req, res).catch(function onRequestError(error) {
            logger.fatal('fatal error in request router', { error });
            logger.fatal('will attempt shutdown');

            const body = 'Internal server error.\n';

            res.writeHead(500, 'Internal Server Error', {
                'content-type': 'text/plain',
                'content-length': Buffer.byteLength(body),
            });

            res.end(body);

            gracefullyExit();
        });
    });

    server.on('error', (error) => {
        logger.fatal('fatal error emitted on server', { error });
        logger.fatal('will attempt shutdown');
        gracefullyExit();
    });

    server.on('listening', () => {
        const { port } = server.address();
        logger.log(`server running at http://localhost:${ port }`);
    });

    server.listen(config.server.port);

    function gracefullyExit() {
        // Give the server some time to gracefully shutdown before forcing an exit.
        const shutdownTimeout = setTimeout(() => {
            process.exit(1);
        }, 20 * 1000);

        server.close(() => {
            clearTimeout(shutdownTimeout);
        });
    }
}

main().catch((error) => {
    /* eslint-disable no-console */
    console.error('Error starting server:');
    console.error(error);
    /* eslint-enable no-console */
});
