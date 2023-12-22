import PathToRegexp from 'path-to-regexp';
import { KixxAssert } from '../../dependencies.js';
import { WrappedError } from '../errors.js';


const { assert, isFunction, isNonEmptyString } = KixxAssert;


export default class Route {

    #eventBus = null;
    #targets = [];
    #patternMatchers = [];
    #allowedMethods = [];
    #components = new Map();

    constructor(spec, options) {
        const {
            patterns,
            targets,
        } = spec;

        const { eventBus } = options;

        assert(
            Array.isArray(patterns),
            'Route patterns must be an array'
        );

        assert(
            Array.isArray(targets),
            'Route targets must be an array'
        );

        const patternMatchers = patterns.map((pattern) => {
            return PathToRegexp.match(pattern, { decode: decodeURIComponent });
        });

        let allowedMethods = [];

        for (const target of targets) {
            assert(
                isNonEmptyString(target.component),
                'Route target component must be a non empty string'
            );
            assert(
                Array.isArray(target.methods),
                'Route target methods must be an array'
            );

            allowedMethods = allowedMethods.concat(target.methods);
        }

        this.#eventBus = eventBus;
        this.#targets = targets;
        this.#patternMatchers = patternMatchers;
        this.#allowedMethods = Object.freeze(allowedMethods);
    }

    async initialize(componentFactories) {
        for (const target of this.#targets) {
            const factory = componentFactories[target.component];

            assert(
                factory,
                `Component factory "${ target.component }" is not registered`
            );

            assert(
                isFunction(factory),
                `Component factory "${ target.component }" is not a function`
            );

            const component = await factory(target.options);

            this.#components.set(target.component, component);
        }
    }

    matchURL(url) {
        for (const matcher of this.#patternMatchers) {
            const match = matcher(url.pathname);

            if (match) {
                return {
                    route: this,
                    pathnameParams: match.params,
                };
            }
        }

        return null;
    }

    async handleRequest(request, response) {
        if (!this.#allowedMethods.includes(request.method)) {
            return this.#returnNotAllowedResponse(request, response);
        }

        const target = this.#getTargetForMethod(request.method);
        const component = this.#components.get(target.component);

        let res;

        // By using `await route.handleRequest()` we cast the result to a Promise and catch any errors
        // appropriately no matter if the handeRequest() function is async or blocking.
        try {
            res = await component.handleRequest(request, response, target.options);
        } catch (error) {
            if (isFunction(component.handleError)) {
                res = component.handleError(error, request, response, target.options);
            }

            if (!res) {
                res = this.handleError(error, request, response, target.options);
            }

            if (!(error instanceof WrappedError) || error.fatal) {
                this.#eventBus.emit('error', error);
            }
        }

        return res;
    }

    #getTargetForMethod(method) {
        for (const target of this.#targets) {
            if (target.methods.includes(method)) {
                return target;
            }
        }

        return null;
    }

    #returnNotAllowedResponse(request, response) {
        const { method, url } = request;

        let body = `The HTTP method ${ method } is not allowed on the URL path ${ url.pathname }.\n`;
        body += `Use ${ this.#allowedMethods.join(', ') } instead.\n`;

        response.headers.set('allowed', this.#allowedMethods.join(', '));

        return response.respondWithPlainText(405, body);
    }
}
