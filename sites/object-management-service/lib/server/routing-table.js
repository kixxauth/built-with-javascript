import { KixxAssert } from '../../dependencies.js';
import PathToRegexp from 'path-to-regexp';
import Route from './route.js';

const {
    isFunction,
    isNonEmptyString,
    assert,
} = KixxAssert;


export default class RoutingTable {

    #logger = null;
    #routeMatchers = [];
    #httpInterfacesByName = new Map();

    constructor({ logger }) {
        this.#logger = logger.createChild({ name: 'RoutingTable' });
    }

    registerHTTPInterface(name, component) {
        this.#httpInterfacesByName.set(name, component);
    }

    registerRoutes(routes) {
        for (const endpoint of routes) {
            const httpInterfaceName = endpoint.HTTPInterface;
            const pattern = endpoint.pattern;
            const methods = endpoint.methods;

            assert(
                isNonEmptyString(httpInterfaceName),
                'Missing route HTTPInterface name String'
            );

            const httpInterface = this.#httpInterfacesByName.get(httpInterfaceName);

            assert(
                httpInterface,
                `Missing expected HTTP Interface by name "${ httpInterfaceName }"`
            );

            assert(
                isNonEmptyString(pattern),
                'Missing route pattern String'
            );

            assert(
                methods,
                'Missing expected HTTP methods Object'
            );

            for (const httpMethodName of Object.keys(methods)) {
                const methodName = methods[httpMethodName];

                assert(
                    isNonEmptyString(methodName),
                    `Missing HTTP Interface method name in pattern ${ pattern }`
                );

                assert(
                    isFunction(httpInterface[methodName]),
                    `Invalid HTTP Interface method "${ httpInterfaceName }.${ methodName }"`
                );
            }

            const matchPathname = PathToRegexp.match(pattern, { decode: decodeURIComponent });

            this.#routeMatchers.push((pathname) => {
                const patternMatch = matchPathname(pathname);

                if (patternMatch) {
                    return {
                        httpInterface,
                        methods,
                        params: patternMatch.params,
                    };
                }

                return null;
            });
        }
    }

    routeRequest(request, response) {
        const route = this.#findRoute(request);

        if (!route) {
            return this.#returnNotFoundResponse(request, response);
        }

        if (!route.allowsHttpMethod(request.method)) {
            if (route.canSendNotAllowedResponse()) {
                return route.returnNotAllowedResponse(request, response);
            }

            return this.#returnNotAllowedResponse(route.getAllowedMethods(), request, response);
        }

        try {
            return route.handleRequest(request, response);
        } catch (error) {
            if (route.canHandleError()) {
                return route.handleError(error, request, response);
            }

            return this.#handleError(error, request, response);
        }
    }

    #findRoute(request) {
        const { pathname } = request.url;

        for (const matcher of this.#routeMatchers) {
            const match = matcher(pathname);

            if (match) {
                return new Route(match);
            }
        }

        return null;
    }

    #handleError(error, request, response) {
        this.#logger.error('error in request handler', { error });

        const { url } = request;
        const body = `There was an internal error on the server while processing ${ url.pathname }.\n`;

        return response.respondWithPlainText(500, body);
    }

    #returnNotFoundResponse(request, response) {
        const { url } = request;
        const body = `The URL path ${ url.pathname } could not be found on this server.\n`;

        return response.respondWithPlainText(404, body);
    }

    #returnNotAllowedResponse(allowedMethods, request, response) {
        const { method, url } = request;

        let body = `The HTTP method ${ method } is not allowed on the URL path ${ url.pathname }.\n`;
        body += `Use ${ allowedMethods.join(', ') } instead.\n`;

        response.headers.set('allowed', allowedMethods.join(', '));

        return response.respondWithPlainText(405, body);
    }
}
