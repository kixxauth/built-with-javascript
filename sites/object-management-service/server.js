import http from 'node:http';
import { Logger } from 'kixx-logger';
import Config from './lib/config/config.js';
import RoutingTable from './lib/server/routing-table.js';
import HTTPRequestTarget from './lib/server/http-request-target.js';
import routes from './routes.js';
import AdminRPCTarget from './lib/http-interfaces/admin-rpc-target.js';


const ROOT_DIR_FILE_URL = new URL('./', import.meta.url);

// TODO: Replace PORT with config value.
const PORT = 3003;


const config = new Config({
    rootConfigDir: new URL('config/', ROOT_DIR_FILE_URL),
});

config.load('development');

const logger = Logger.create({
    name: 'server',
    // TODO: Replace level with config value.
    level: Logger.Levels.DEBUG,
    serializers: {
        req(req) {
            return {
                method: req.method,
                url: req.url,
                contentLength: req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0,
            };
        },
        error(error) {
            return {
                name: error.name || 'NO_NAME',
                code: error.code || 'NO_CODE',
                message: error.message || 'NO_MESSAGE',
                stack: error.stack ? error.stack.split('\n') : 'NO_STACK',
            };
        },
    },
});

const routingTable = new RoutingTable({ logger });
const httpRequestTarget = new HTTPRequestTarget({ logger, routingTable });

routingTable.registerHTTPInterface('AdminRPCTarget', new AdminRPCTarget({
    logger,
}));

routingTable.registerRoutes(routes);


function printErrorAndExit(message, error) {
    logger.error(message, { error });
    process.exit(1);
}


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
    // eslint-disable-next-line no-console
    logger.log(`server running at http://localhost:${ PORT }`);
});

server.listen(PORT);
