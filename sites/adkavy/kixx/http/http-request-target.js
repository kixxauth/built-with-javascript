import { KixxAssert } from '../../dependencies.js';
import HTTPRequest from './http-request.js';
import HTTPResponse from './http-response.js';


const { isFunction } = KixxAssert;


export default class HttpRequestTarget {

    #logger = null;
    #routeMatchers = [];

    constructor({ logger }) {
        this.#logger = logger;
    }

    registerRoute(route) {
        this.#routeMatchers.push(function attemptMatchRoute(url) {
            const match = route.matchURL(url);

            if (match) {
                return {
                    route: match.route,
                    pathnameParams: match.pathnameParams,
                };
            }

            return null;
        });
    }

    handleRequest(req, res) {
        const { method } = req;
        const fullURL = req.url;
        const contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

        this.#logger.log('http request', {
            method,
            url: fullURL,
            contentLength,
        });

        const url = new URL(req.url, `${ this.#getProtocol(req) }://${ this.#getHost(req) }`);

        let request;
        let response;

        const match = this.#findMatchingRoute(url);

        if (match) {
            const { route, pathnameParams } = match;
            request = new HTTPRequest({ req, url, pathnameParams });
            response = new HTTPResponse();

            response = route.handleRequest(request, response);
        } else {
            request = new HTTPRequest({ req, url });
            response = new HTTPResponse();

            response = this.handleNotFound(request, response);
        }

        const {
            status,
            statusMessage,
            headers,
            body,
        } = response;

        const responseContentLength = headers.has('content-length') ? parseInt(headers.get('content-length'), 10) : 0;

        this.#logger.log('http response', {
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

    #findMatchingRoute(url) {
        for (const matcherFunction of this.#routeMatchers) {
            const match = matcherFunction(url);

            if (match) {
                return match;
            }
        }

        return null;
    }

    #getProtocol(req) {
        return req.headers['x-forwarded-proto'] || 'http';
    }

    #getHost(req) {
        return req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    }
}
