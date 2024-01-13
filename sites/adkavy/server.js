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
import { registerHTMLPages } from './lib/html-pages/mod.js';
import { registerObservations } from './lib/observations/mod.js';

import { createLogger } from './lib/logger.js';
import { fromFileUrl } from './lib/utils.js';

import routes from './seeds/routes.js';

const { NodeHTTPRouter } = Kixx.HTTP;


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

    eventBus.on('KixxHTTPRequest', (ev) => {
        const { method, url, route, target } = ev;
        logger.debug('kixx http request', { method, route, target, href: url.href });
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

    const router = new NodeHTTPRouter({
        logger: logger.createChild({ name: 'HTTPRouter' }),
        eventBus,
    });

    //
    // Register plugins:
    //

    // Static File Server Plugin
    registerStaticFileServer(router, {
        eventBus,
        logger,
        publicDirectory: path.join(ROOT_DIR, 'public'),
    });

    // Cacheable HTML Page Plugin
    registerHTMLPages(router, {
        eventBus,
        logger,
        dataStore,
        blobStore,
        templateStore,
        noCache: !config.pages.cache,
    });

    // ADK Observations Plugin
    registerObservations(router, {
        eventBus,
        logger,
    });


    for (const routeSpec of routes) {
        router.registerRoute(routeSpec);
    }

    const server = http.createServer((req, res) => {

        req.on('error', (error) => {
            logger.warn('request error event', { name: error.name, code: error.code, message: error.message });
        });

        const contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

        logger.info('http request', {
            method: req.method,
            url: req.url,
            contentLength,
        });

        function onRequestSuccess(newResponse) {
            const responseContentLength = newResponse.headers.has('content-length')
                ? parseInt(newResponse.headers.get('content-length'), 10)
                : 0;

            logger.info('http response', {
                status: newResponse.status,
                method: req.method,
                url: req.url,
                contentLength: responseContentLength,
            });
        }

        function onRequestError(error) {
            logger.fatal('fatal error in request router', { error });

            const body = 'Internal server error.\n';
            const responseContentLength = Buffer.byteLength(body);

            logger.info('http response', {
                status: 500,
                method: req.method,
                url: req.url,
                contentLength: responseContentLength,
            });

            res.writeHead(500, 'Internal Server Error', {
                'content-type': 'text/plain',
                'content-length': responseContentLength,
            });

            res.end(body);

            logger.fatal('will attempt shutdown');
            gracefullyExit();
        }

        router.handleRequest(req, res).then(onRequestSuccess, onRequestError);
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
