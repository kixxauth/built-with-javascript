import { KixxAssert } from '../../dependencies.js';
import HTTPRequest from './http-request.js';
import HTTPResponse from './http-response.js';
import { headersToObject } from './http-headers.js';

const { isFunction } = KixxAssert;


export default class HTTPRequestTarget {

    #logger = null;
    #routingTable = null;
    #requestId = 0;

    constructor(spec) {
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

        const url = new URL(req.url, `${ this.#getProtocol(req) }://${ this.#getHost(req) }`);

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

        if (body) {
            // If the body is a stream which can be piped, then pipe it.
            if (isFunction(body.pipe)) {
                body.pipe(res);
            } else {
                res.end(body);
            }
        } else {
            res.end();
        }
    }

    #getProtocol(req) {
        return req.headers['x-forwarded-proto'] || 'http';
    }

    #getHost(req) {
        return req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    }

    #getRequestId() {
        this.#requestId += 1;
        return this.#requestId;
    }
}
