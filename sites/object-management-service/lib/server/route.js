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

    handleRequest(request, response) {
        const { method } = request;
        const methodName = this.#methods[method];

        const handler = this.#httpInterface[methodName].bind(this.#httpInterface);

        request.params = this.#params;
        return handler(request, response);
    }

    canHandleError() {
        return isFunction(this.#httpInterface.handleError);
    }

    handleError(error, request, response) {
        return this.#httpInterface.handleError(error, request, response);
    }

    canSendNotAllowedResponse() {
        return isFunction(this.#httpInterface.returnNotAllowedResponse);
    }

    returnNotAllowedResponse(request, response) {
        return this.#httpInterface.returnNotAllowedResponse(this.#supportedHttpMethods, request, response);
    }
}
