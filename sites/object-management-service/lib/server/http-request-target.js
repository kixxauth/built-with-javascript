import HTTPRequest from './http-request.js';
import HTTPResponse from './http-response.js';
import { headersToObject } from './headers-to-object.js';


export default class HTTPRequestTarget {

    #routingTable = null;
    #config = null;

    constructor(spec) {
        this.#config = spec.config;
        this.#routingTable = spec.routingTable;
    }

    async handleRequest(req, res) {
        const url = new URL(req.url, `${ this.#getProtocol(req) }//${ this.#getHostname(req) }:${ this.#getPort(req) }`);

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

    #getProtocol() {
        return 'http:';
    }

    #getHostname(req) {
        const host = req.headers.host;

        if (host) {
            const { hostname } = new URL(`http://${ host }`);
            return hostname;
        }

        return 'localhost';
    }

    #getPort() {
        return this.#config.server.getPort();
    }
}
