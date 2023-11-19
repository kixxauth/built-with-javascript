import http from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { EventEmitter } from 'node:events';
import Config from './lib/config/mod.js';
import { createLogger } from './lib/logger.js';
import RoutingTable from './lib/server/routing-table.js';
import HTTPRequestTarget from './lib/server/http-request-target.js';
import StaticFileServer from './lib/http-interfaces/static-file-server.js';
import HTMLPage from './lib/http-interfaces/html-page.js';
import Observations from './lib/http-interfaces/observations.js';
import Events from './lib/http-interfaces/events.js';
import IncidentReports from './lib/http-interfaces/incident-reports.js';
import DataStore from './lib/stores/data-store.js';
import PageDataStore from './lib/stores/page-data-store.js';
import PageSnippetStore from './lib/stores/page-snippet-store.js';
import TemplateStore from './lib/stores/template-store.js';
import routes from './routes.js';
import { fromFileUrl } from './lib/utils.js';


const ROOT_DIR = fromFileUrl(new URL('./', import.meta.url));

const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];


async function start() {
    const args = parseArgs({
        args: process.argv.slice(2),
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
        name: 'server',
        level: config.logger.getLevel(),
        makePretty: config.logger.getMakePretty(),
    });

    logger.log('starting server', { environment });

    const eventBus = new EventEmitter();

    eventBus.on('error', (error) => {
        printErrorAndExit('Error event on EventBus', error);
    });

    function printErrorAndExit(message, error) {
        logger.error(message, { error });

        // Allow time for the error message to print before exiting.
        setTimeout(() => {
            process.exit(1);
        }, 200);
    }

    const datastore = new DataStore();

    const pageDataStore = new PageDataStore({
        directory: path.join(ROOT_DIR, 'pages'),
        logger,
        eventBus,
    });

    const pageSnippetStore = new PageSnippetStore({
        directory: path.join(ROOT_DIR, 'pages-snippets'),
        logger,
        eventBus,
    });

    const templateStore = new TemplateStore({
        directory: path.join(ROOT_DIR, 'templates'),
        logger,
        eventBus,
    });

    const routingTable = new RoutingTable({ logger });
    const httpRequestTarget = new HTTPRequestTarget({ logger, routingTable });

    routingTable.registerHTTPInterface('StaticFileServer', new StaticFileServer({
        logger,
        publicDirectory: path.join(ROOT_DIR, 'public'),
    }));

    routingTable.registerHTTPInterface('HTMLPage', new HTMLPage({
        logger,
        eventBus,
        pageDataStore,
        pageSnippetStore,
        templateStore,
    }));

    routingTable.registerHTTPInterface('Observations', new Observations({
        logger,
        eventBus,
        pageDataStore,
        pageSnippetStore,
        templateStore,
        datastore,
    }));

    routingTable.registerHTTPInterface('Events', new Events({
        logger,
    }));

    routingTable.registerHTTPInterface('IncidentReports', new IncidentReports({
        logger,
    }));

    routingTable.registerRoutes(routes);

    const server = http.createServer((req, res) => {

        req.on('error', (error) => {
            printErrorAndExit('request error event', error);
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

    server.listen(config.server.getPort());
}


start().catch((error) => {
    /* eslint-disable no-console */
    console.error('Error starting server:');
    console.error(error);
    /* eslint-enable no-console */
});
