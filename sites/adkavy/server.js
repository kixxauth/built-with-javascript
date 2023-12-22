import path from 'node:path';
import http from 'node:http';
import util from 'node:util';
import { EventEmitter } from 'node:events';
import Kixx from './kixx/mod.js';
import Config from './lib/config/mod.js';
import { createLogger } from './lib/logger.js';
import { fromFileUrl } from './lib/utils.js';

const { ConfigStore, ModuleFileStorageEngine } = Kixx.Stores;
const { HTTPRequestTarget, Route } = Kixx.HTTP;


const ROOT_DIR = fromFileUrl(new URL('./', import.meta.url));

const NAME = 'adkavy';

const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];


async function start() {
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

    const config = new Config({
        rootConfigDir: path.join(ROOT_DIR, 'config'),
    });

    await config.load(environment);

    const logger = createLogger({
        name: NAME,
        level: config.logger.level,
        makePretty: config.logger.makePretty,
    });

    function printErrorAndExit(message, error) {
        logger.error(message, { error });

        // Allow time for the error message to print before exiting.
        setTimeout(() => {
            process.exit(1);
        }, 200);
    }

    const eventBus = new EventEmitter();

    eventBus.on('error', (error) => {
        // TODO: How do we shut down the server here?
        printErrorAndExit('Error event on EventBus', error);
    });

    const configStoreEngine = new ModuleFileStorageEngine();

    const configStore = new ConfigStore({
        eventBus,
        logger,
        engine: configStoreEngine,
    });

    const componentFactories = {};

    const routeSpecs = configStore.fetch('routes');

    const routes = routeSpecs.map((spec) => {
        return new Route(spec, { eventBus });
    });

    const httpRequestTarget = new HTTPRequestTarget({ logger });

    for (const route of routes) {
        await route.initialize(componentFactories);
        httpRequestTarget.registerRoute(route);
    }

    const server = http.createServer((req, res) => {

        req.on('error', (error) => {
            logger.warn('request error event', { name: error.name, code: error.code, message: error.message });
        });

        httpRequestTarget.handleRequest(req, res).catch(function onRequestError(error) {
            const body = 'Internal server error.\n';

            res.writeHead(500, 'Internal Server Error', {
                'content-type': 'text/plain',
                'content-length': Buffer.byteLength(body),
            });

            res.end(body);

            printErrorAndExit('internal server error', error);
        });
    });

    server.on('error', (error) => {
        printErrorAndExit('server error event', error);
    });

    server.on('listening', () => {
        const { port } = server.address();
        logger.log(`server running at http://localhost:${ port }`);
    });

    server.listen(config.server.port);
}

start().catch((error) => {
    /* eslint-disable no-console */
    console.error('Error starting server:');
    console.error(error);
    /* eslint-enable no-console */
});
