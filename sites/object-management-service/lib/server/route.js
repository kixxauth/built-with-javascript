import { KixxAssert } from '../../dependencies.js';

const { isFunction } = KixxAssert;


export default class Route {

    #httpInterface = null;
    #methods = null;
    #supportedHttpMethods = [];
    #params = {};

    constructor(matcher) {
        const {
            httpInterface,
            methods,
            params,
        } = matcher;

        this.#httpInterface = httpInterface;
        this.#methods = methods;
        this.#supportedHttpMethods = Object.keys(methods);
        this.#params = params;
    }

    getAllowedMethods() {
        return this.#supportedHttpMethods;
    }

    allowsHttpMethod(method) {
        return this.#supportedHttpMethods.includes(method);
    }

    handleRequest(request) {
        const { method } = request;
        const methodName = this.#methods[method];

        const handler = this.#httpInterface[methodName].bind(this.#httpInterface);

        request.params = this.#params;
        return handler(request);
    }

    handleError(error, request) {
        if (isFunction(this.#httpInterface.handleError)) {
            return this.#httpInterface.handleError(error, request);
        }
        return null;
    }

    createNotAllowedResponse(request) {
        if (isFunction(this.#httpInterface.createNotAllowedResponse)) {
            return this.#httpInterface.createNotAllowedResponse(this.#supportedHttpMethods, request);
        }
        return null;
    }
}
