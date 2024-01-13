import Errors from '../errors/mod.js';
import HTTPRouter from './http-router.js';
import NodeHTTPRequest from './node-http-request.js';
import NodeHTTPResponse from './node-http-response.js';
import { headersToObject } from './http-utils.js';
import { KixxAssert } from '../../dependencies.js';

const { NotFoundError } = Errors;
const { isFunction } = KixxAssert;


export default class NodeHTTPRouter extends HTTPRouter {

    async handleRequest(req, res) {
        const url = new URL(req.url, `${ this.#getProtocol(req) }://${ this.#getHost(req) }`);

        const request = new NodeHTTPRequest({ req, url });
        const response = new NodeHTTPResponse();

        let newResponse;

        try {
            newResponse = await this.routeRequest(request, response);
        } catch (error) {
            if (error.code === NotFoundError.CODE) {
                newResponse = this.returnNotFoundResponse(error, request, response);
            } else {
                throw error;
            }
        }

        const {
            status,
            statusMessage,
            headers,
            body,
        } = newResponse;

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

        return newResponse;
    }

    #getProtocol(req) {
        return req.headers['x-forwarded-proto'] || 'http';
    }

    #getHost(req) {
        return req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    }
}
