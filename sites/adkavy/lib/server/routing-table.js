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
                // The GET method configuration should override HEAD. The "HEAD" method is only
                // available for readability.
                const key = httpMethodName === 'HEAD' ? 'GET' : httpMethodName;

                const { method } = methods[key];

                assert(
                    isNonEmptyString(method),
                    `Missing HTTP Interface method name in pattern ${ pattern }`
                );

                assert(
                    isFunction(httpInterface[method]),
                    `Invalid HTTP Interface method "${ httpInterfaceName }.${ method }"`
                );
            }

            const matchPathname = PathToRegexp.match(pattern, { decode: decodeURIComponent });

            this.#routeMatchers.push((pathname) => {
                const patternMatch = matchPathname(pathname);

                if (patternMatch) {
                    return {
                        httpInterface,
                        methods,
                        pathnameParams: patternMatch.params,
                    };
                }

                return null;
            });
        }
    }

    async routeRequest(request, response) {
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

        let res;

        // By using `await route.handleRequest()` we cast the result to a Promise and catch any errors
        // appropriately no matter if the route.handeRequest() function is async or blocking.
        try {
            res = await route.handleRequest(request, response);
        } catch (error) {
            if (route.canHandleError()) {
                res = await route.handleError(error, request, response);
            } else {
                res = await this.#handleError(error, request, response);
            }
        }

        return res;
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
