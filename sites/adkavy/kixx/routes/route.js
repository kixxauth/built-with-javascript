import PathToRegexp from 'path-to-regexp';
import { KixxAssert } from '../../dependencies.js';
import Errors from '../errors/mod.js';

const {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    MethodNotAllowedError,
    NotImplementedError,
} = Errors;

const { assert, isNonEmptyString } = KixxAssert;


export default class Route {

    #targets = [];
    #patternMatchers = [];

    constructor(options) {
        const {
            name,
            eventBus,
            patterns,
            targets,
        } = options;

        assert(isNonEmptyString(name), 'Route name is required');
        assert(eventBus, 'Route eventBus is required');

        assert(
            Array.isArray(patterns),
            'Route patterns must be an array'
        );

        assert(
            Array.isArray(targets),
            'Route targets must be an array'
        );

        Object.defineProperties(this, {
            name: {
                enumerable: true,
                value: name,
            },
            eventBus: {
                value: eventBus,
            },
        });

        this.#targets = targets;

        this.#patternMatchers = patterns.map((pattern) => {
            return PathToRegexp.match(pattern, { decode: decodeURIComponent });
        });
    }

    async handleRequest(request, response) {
        const { url } = request;

        // Will throw a NotFoundError if the URL pathname does not match any
        // of the patterns for this route.
        url.pathnameParams = this.#matchPathname(request);

        let target;

        try {
            target = this.#matchMethod(request);
        } catch (error) {
            if (error.code === MethodNotAllowedError.CODE) {
                return this.returnMethodNotAllowedResponse(request, response);
            }
            throw error;
        }

        this.eventBus.emit('KixxHTTPRequest', {
            method: request.method,
            url: request.url,
            route: this.name,
            target: target.name,
        });

        let res;

        // By using `await route.handleRequest()` we cast the result to a Promise and catch any errors
        // appropriately no matter if the handeRequest() function is async or blocking.
        try {
            res = await target.handleRequest(request, response);
        } catch (error) {
            res = target.handleError(error, request, response);

            if (!res) {
                res = this.handleError(error, request, response, target);
            }

            this.eventBus.emitError(error);
        }

        return res;
    }

    returnMethodNotAllowedResponse(request, response) {
        const { method, url } = request;
        const head = method === 'HEAD';
        const allowedMethods = this.getAllowedMethodsAsArray();

        let body = `The HTTP method ${ method } is not allowed on the URL pathname ${ url.pathname }.\n`;
        body += `Use ${ allowedMethods.join(', ') } instead.\n`;

        response.headers.set('allowed', allowedMethods.join(', '));

        return response.respondWithPlainText(405, body, { head });
    }

    handleError(error, request, response) {
        const { method } = request;
        const head = method === 'HEAD';

        let statusCode;
        let body;

        switch (error.code) {
            case BadRequestError.CODE:
                statusCode = 400;
                body = 'Bad request error.\n';
                break;
            case NotFoundError.CODE:
                statusCode = 404;
                body = 'Not found error.\n';
                break;
            case UnauthorizedError.CODE:
                statusCode = 401;
                body = 'Unauthorized error.\n';
                break;
            case ForbiddenError.CODE:
                statusCode = 403;
                body = 'Forbidden error.\n';
                break;
            case ConflictError.CODE:
                statusCode = 409;
                body = 'Method not allowed error.\n';
                break;
            case MethodNotAllowedError.CODE:
                statusCode = 405;
                body = 'Method not allowed error.\n';
                break;
            case NotImplementedError.CODE:
                statusCode = 501;
                body = 'Not implemented error.\n';
                break;
            default:
                statusCode = 500;
                body = 'Internal server error.\n';
        }

        return response.respondWithPlainText(statusCode, body, { head });
    }

    getAllowedMethodsAsArray() {
        let allowedMethods = [];

        for (const target of this.#targets) {
            allowedMethods = allowedMethods.concat(target.methods);
        }

        return allowedMethods;
    }

    #matchPathname(request) {
        const { pathname } = request.url;

        for (const matcher of this.#patternMatchers) {
            const match = matcher(pathname);
            if (match) {
                return match.params;
            }
        }

        throw new NotFoundError(`No match found for URL pathname ${ pathname }`);
    }

    #matchMethod(request) {
        const { method, url } = request;

        for (const target of this.#targets) {
            if (target.allowsMethod(method)) {
                return target;
            }
        }

        throw new MethodNotAllowedError(`Method ${ method } not allowed on URL pathname ${ url.pathname }`);
    }
}
