import http from 'node:http';
import Config from './lib/config/config.js';
import { createLogger } from './lib/logger.js';
import DataStore from './lib/datastore.js';
import RoutingTable from './lib/server/routing-table.js';
import HTTPRequestTarget from './lib/server/http-request-target.js';
import routes from './routes.js';
import AdminRPCTarget from './lib/http-interfaces/admin-rpc-target.js';


const ROOT_DIR_FILE_URL = new URL('./', import.meta.url);


async function start() {
    const config = new Config({
        rootConfigDir: new URL('config/', ROOT_DIR_FILE_URL),
    });

    await config.load('development');

    const logger = createLogger({
        name: 'server',
        level: config.logger.getLevel(),
        makePretty: config.logger.getMakePretty(),
    });

    function printErrorAndExit(message, error) {
        logger.error(message, { error });

        // Allow time for the error message to print before exiting.
        setTimeout(() => {
            process.exit(1);
        }, 200);
    }

    const dataStore = new DataStore({ config });

    const routingTable = new RoutingTable({ logger });

    const httpRequestTarget = new HTTPRequestTarget({
        config,
        logger,
        routingTable,
    });

    routingTable.registerHTTPInterface('AdminRPCTarget', new AdminRPCTarget({
        logger,
        dataStore,
    }));

    routingTable.registerRoutes(routes);

    const server = http.createServer((req, res) => {

        logger.log('http request', { req });

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
