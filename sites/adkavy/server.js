import path from 'node:path';
import http from 'node:http';
import util from 'node:util';
import { EventEmitter } from 'node:events';
import Kixx from './kixx/mod.js';
import ConfigManager from './lib/config-manager/config-manager.js';

import {
    createDataStore,
    createBlobStore,
    createTemplateStore
} from './lib/stores/mod.js';

import { registerStaticFileServer } from './lib/static-file-server/mod.js';
import { registerStaticHTMLPage } from './lib/static-html-page/mod.js';
import { registerObservations } from './lib/observations/mod.js';

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

    const dataStore = createDataStore({
        config,
        eventBus,
        logger: logger.createChild({ name: 'DataStore' }),
    });

    const blobStore = createBlobStore();

    const templateStore = createTemplateStore({
        logger: logger.createChild({ name: 'TemplateStore' }),
        directory: path.join(ROOT_DIR, 'templates'),
    });

    const components = {
        config,
        eventBus,
        logger,
        dataStore,
        blobStore,
        templateStore,
    };

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

    // Register plugins:
    registerStaticFileServer(components, router);
    registerStaticHTMLPage(components, router);
    registerObservations(components, router);

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
