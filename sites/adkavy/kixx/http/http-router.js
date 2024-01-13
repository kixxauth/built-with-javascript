import { KixxAssert } from '../../dependencies.js';
import Errors from '../errors/mod.js';
import Route from '../routes/route.js';

const { NotImplementedError, NotFoundError } = Errors;
const { assert, isFunction, isNonEmptyString } = KixxAssert;

export default class HTTPRouter {

    #registeredRouteFactories = new Map();
    #registeredTargetFactories = new Map();
    #routes = [];

    constructor({ eventBus }) {
        Object.defineProperties(this, {
            eventBus: {
                value: eventBus,
            },
        });
    }

    registerRouteFactory(name, factoryFunction) {
        assert(isNonEmptyString(name), 'A Route factory must have a name');
        assert(isFunction(factoryFunction), 'A Route factory must be a function');
        this.#registeredRouteFactories.set(name, factoryFunction);
    }

    registerTargetFactory(name, factoryFunction) {
        assert(isNonEmptyString(name), 'A Target factory must have a name');
        assert(isFunction(factoryFunction), 'A Target factory must be a function');
        this.#registeredTargetFactories.set(name, factoryFunction);
    }

    registerRoute(spec) {
        const {
            routeName,
            patterns,
            targets,
        } = spec;

        assert(
            Array.isArray(patterns),
            'Route patterns must be an array'
        );

        assert(
            Array.isArray(targets),
            'Route targets must be an array'
        );

        let createRoute;

        if (routeName) {
            assert(
                this.#registeredRouteFactories.has(routeName),
                `No Route factory registered for "${ routeName }"`
            );
            createRoute = this.#registeredRouteFactories.get(routeName);
        } else {
            createRoute = this.defaultRouteFactory.bind(this);
        }

        const targetInstances = targets.map(({ methods, targetName, options }) => {
            assert(
                this.#registeredTargetFactories.has(targetName),
                `No Target registered for "${ targetName }"`
            );

            const createTarget = this.#registeredTargetFactories.get(targetName);
            return createTarget({ name: targetName, methods, options });
        });

        const route = createRoute({
            name: routeName || 'DefaultRoute',
            patterns,
            targets: targetInstances,
        });

        this.#routes.push(route);
    }

    handleRequest() {
        throw new NotImplementedError('The platform specific handleRequest() method has not been implemented');
    }

    async routeRequest(request, response) {
        for (const route of this.#routes) {
            let newResponse;
            try {
                newResponse = await route.handleRequest(request, response);
            } catch (error) {
                if (error.code !== NotFoundError.CODE) {
                    newResponse = this.handleError(error, request, response);
                    this.eventBus.emit('error', error);
                }
            }

            if (newResponse) {
                const now = new Date();
                newResponse.headers.set('date', now.toUTCString());
                return newResponse;
            }
        }

        this.eventBus.emit('KixxHTTPRequest', {
            method: request.method,
            url: request.url,
            route: null,
            target: null,
        });

        throw new NotFoundError(`The URL pathname ${ request.url.pathname } cannot be found on this server`);
    }

    handleError(error, request, response) {
        const { method } = request;
        const head = method === 'HEAD';
        return response.respondWithPlainText(500, 'Internal server error.\n', { head });
    }

    returnNotFoundResponse(error, request, response) {
        const { method } = request;
        const head = method === 'HEAD';
        const { pathname } = request.url;
        return response.respondWithPlainText(404, `URL ${ pathname } not found on this server.\n`, { head });
    }


    defaultRouteFactory({ name, patterns, targets }) {
        const { eventBus } = this;

        return new Route({
            name,
            eventBus,
            patterns,
            targets,
        });
    }
}
