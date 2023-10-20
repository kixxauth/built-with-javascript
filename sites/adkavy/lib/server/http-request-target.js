import HTTPRequest from './http-request.js';
import HTTPResponse from './http-response.js';
import { headersToObject } from './http-headers.js';


export default class HTTPRequestTarget {

    #logger = null;
    #routingTable = null;
    #requestId = 0;

    constructor({ logger, routingTable }) {
        this.#logger = logger.createChild({ name: 'HTTPRequestTarget' });
        this.#routingTable = routingTable;
    }

    async handleRequest(server, req, res) {
        const id = this.#getRequestId();
        const { method } = req;
        const fullURL = req.url;
        const contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

        this.#logger.log('http request', {
            id,
            method,
            url:
            fullURL,
            contentLength,
        });

        const protocol = this.#getProtocol(server, req);
        const hostname = this.#getHostname(server, req);
        const port = this.#getPort(server, req);
        const url = new URL(req.url, `${ protocol }//${ hostname }:${ port }`);

        const request = new HTTPRequest({ req, url });
        let response = new HTTPResponse();

        response = await this.#routingTable.routeRequest(request, response);

        const {
            status,
            statusMessage,
            headers,
            body,
        } = response;

        const responseContentLength = headers.has('content-length') ? parseInt(headers.get('content-length'), 10) : 0;

        this.#logger.log('http response', {
            id,
            status,
            method,
            url: fullURL,
            contentLength: responseContentLength,
        });

        res.writeHead(status, statusMessage, headersToObject(headers));
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

    #getPort(server) {
        const { port } = server.address();
        return port;
    }

    #getRequestId() {
        this.#requestId += 1;
        return this.#requestId;
    }
}
