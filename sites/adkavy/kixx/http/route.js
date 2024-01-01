import PathToRegexp from 'path-to-regexp';
import { KixxAssert } from '../../dependencies.js';
import {
    WrappedError,
    NotFoundError,
    MethodNotAllowedError } from '../errors/mod.js';

const { assert } = KixxAssert;


export default class Route {

    #eventBus = null;
    #targets = [];
    #patternMatchers = [];

    constructor(options) {
        const {
            eventBus,
            patterns,
            targets,
        } = options;

        assert(eventBus, 'Route eventBus is required');

        assert(
            Array.isArray(patterns),
            'Route patterns must be an array'
        );

        assert(
            Array.isArray(targets),
            'Route targets must be an array'
        );

        this.#eventBus = eventBus;

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

            if (!(error instanceof WrappedError) || error.fatal) {
                this.#eventBus.emit('error', error);
            }
        }

        return res;
    }

    returnMethodNotAllowedResponse(request, response) {
        const { method, url } = request;
        const allowedMethods = this.getAllowedMethodsAsArray();

        let body = `The HTTP method ${ method } is not allowed on the URL pathname ${ url.pathname }.\n`;
        body += `Use ${ allowedMethods.join(', ') } instead.\n`;

        return response.respondWithPlainText(405, body, {
            allowed: allowedMethods.join(', '),
        });
    }

    handleError(error, request, response) {
        return response.respondWithPlainText(500, 'Internal server error.\n');
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
