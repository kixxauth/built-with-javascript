import http from 'node:http';
import RoutingTable from './lib/server/routing-table.js';
import HTTPRequestTarget from './lib/server/http-request-target.js';
import routes from './routes.js';
import AdminRPCTarget from './lib/http-interfaces/admin-rpc-target.js';


const PORT = 3003;


const routingTable = new RoutingTable();
const httpRequestTarget = new HTTPRequestTarget({ routingTable });

routingTable.registerHTTPInterface('AdminRPCTarget', new AdminRPCTarget());

routingTable.registerRoutes(routes);


function printErrorAndExit(message, error) {
    /* eslint-disable no-console */
    console.error(message);
    console.error(error);
    process.exit(1);
    /* eslint-enable no-console */
}


const server = http.createServer((req, res) => {

    // eslint-disable-next-line no-console
    console.log(req.method, req.url);

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
    console.log(`server running at http://localhost:${ PORT }`);
});

server.listen(PORT);
