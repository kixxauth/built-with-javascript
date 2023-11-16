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
        // Map HEAD requests to GET.
        const httpMethod = request.method === 'HEAD' ? 'GET' : request.method;

        const { method, options } = this.#methods[httpMethod];

        const handler = this.#httpInterface[method].bind(this.#httpInterface);

        request.setPathnameParams(this.#params);

        // May not always return a Promise!
        return handler(request, response, options);
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
