import HTTPRequest from './http-request.js';
import HTTPResponse from './http-response.js';
import { headersToObject } from './http-headers.js';


export default class HTTPRequestTarget {

    #config = null;
    #logger = null;
    #routingTable = null;
    #requestId = 0;

    constructor(spec) {
        this.#config = spec.config;
        this.#logger = spec.logger.createChild({ name: 'HTTPRequestTarget' });
        this.#routingTable = spec.routingTable;
    }

    async handleRequest(req, res) {
        const requestId = this.#getRequestId();
        const { method } = req;
        const fullURL = req.url;
        const contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

        this.#logger.log('http request', {
            requestId,
            method,
            url:
            fullURL,
            contentLength,
        });

        const url = new URL(req.url, `${ this.#getProtocol(req) }//${ this.#getHostname(req) }:${ this.#getPort(req) }`);

        const request = new HTTPRequest({ req, url, requestId });
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
            requestId,
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

    #getPort() {
        return this.#config.server.getPort();
    }

    #getRequestId() {
        this.#requestId += 1;
        return this.#requestId;
    }
}
