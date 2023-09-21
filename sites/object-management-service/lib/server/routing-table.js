import { KixxAssert } from '../../dependencies.js';
import PathToRegexp from 'path-to-regexp';
import Route from './route.js';

const {
    isFunction,
    isNonEmptyString,
    assert,
} = KixxAssert;


export default class RoutingTable {

    #routeMatchers = [];
    #httpInterfacesByName = new Map();

    setRoutes(routes) {
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

    async routeRequest(request) {
        const route = this.#findRoute(request);
        let response;

        if (!route) {
            return this.#createNotFoundResponse(request);
        }

        if (!route.allowsHttpMethod(request.method)) {
            response = route.createNotAllowedResponse(request);
            if (response) {
                return response;
            }

            return this.#createNotAllowedResponse(route.getAllowedMethods(), request);
        }

        try {
            response = await route.handleRequest(request);
        } catch (error) {
            response = route.handleError(error, request);
            if (!response) {
                response = this.#handleError(error, request);
            }
        }

        return response;
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

    #handleError(error, request) {
        // TODO: We need a logger.
        /* eslint-disable no-console */
        console.error('Error in request handler:');
        console.error(error);
        /* eslint-enable no-console */

        const { url } = request;
        const body = `There was an internal error on the server while processing ${ url.pathname }.\n`;

        const headers = new Headers({
            'content-type': 'text/plain',
            'content-length': Buffer.byteLength(body),
        });

        return new Response(body, {
            status: 500,
            statusText: 'Internal Server Error',
            headers,
        });
    }

    #createNotFoundResponse(request) {
        const { url } = request;
        const body = `The URL path ${ url.pathname } could not be found on this server.\n`;

        const headers = new Headers({
            'content-type': 'text/plain',
            'content-length': Buffer.byteLength(body),
        });

        return new Response(body, {
            status: 404,
            statusText: 'Not Found',
            headers,
        });
    }

    #createNotAllowedResponse(allowedMethods, request) {
        const { method, url } = request;

        let body = `The HTTP method ${ method } is not allowed on the URL path ${ url.pathname }.\n`;
        body += `Use ${ allowedMethods.join(', ') } instead.\n`;

        const headers = new Headers({
            'content-type': 'text/plain',
            'content-length': Buffer.byteLength(body),
            allowed: allowedMethods.join(', '),
        });

        return new Response(body, {
            status: 405,
            statusText: 'Method Not Allowed',
            headers,
        });
    }
}
