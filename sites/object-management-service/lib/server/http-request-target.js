import HTTPRequest from './http-request.js';
import HTTPResponse from './http-response.js';
import { headersToObject } from './headers-to-object.js';


export default class HTTPRequestTarget {

    #routingTable = null;

    constructor(spec) {
        this.#routingTable = spec.routingTable;
    }

    async handleRequest(req, res) {
        // TODO: Dynamically get protocol, host, and port from configuration.
        const url = new URL(req.url, `http://localhost:3003`);

        const request = new HTTPRequest({ req, url });
        let response = new HTTPResponse();

        response = await this.#routingTable.routeRequest(request, response);

        const {
            statusCode,
            statusMessage,
            headers,
            body,
        } = response;

        res.writeHead(statusCode, statusMessage, headersToObject(headers));
        res.end(body);
    }
}
