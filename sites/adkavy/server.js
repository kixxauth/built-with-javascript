import http from 'node:http';
import Config from './lib/config/config.js';
import { createLogger } from './lib/logger.js';
import RoutingTable from './lib/server/routing-table.js';
import HTTPRequestTarget from './lib/server/http-request-target.js';
import routes from './routes.js';


start().catch((error) => {
    /* eslint-disable no-console */
    console.error('Error starting server:');
    console.error(error);
    /* eslint-enable no-console */
});
