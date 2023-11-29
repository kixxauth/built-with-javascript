import { KixxAssert } from '../../dependencies.js';
import {
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    JSONParsingError } from '../errors.js';
import Scope from '../models/scope.js';
import HTTPRequestSession from '../models/http-request-session.js';

const {
    isFunction,
    isNonEmptyString,
    isPlainObject,
    toFriendlyString,
} = KixxAssert;


export default class AdminRPCTarget {

    allowedRPCMethods = Object.freeze([ 'createScopedToken' ]);

    #config = null;
    #logger = null;
    #dataStore = null;

    constructor({ config, logger, dataStore }) {
        this.#config = config;
        this.#logger = logger.createChild({ name: 'AdminRPCTarget' });
        this.#dataStore = dataStore;
    }

    /**
     * @public
     */
    handleError(error, request, response, jsonResponse) {
        jsonResponse = jsonResponse || { jsonrpc: '2.0', id: null };

        const { requestId } = request;
        let message;
        let code;

        switch (error.code) {
            case JSONParsingError.CODE:
                code = -32700;
                message = error.message;
                break;
            case UnauthorizedError.CODE:
            case ForbiddenError.CODE:
            case NotFoundError.CODE:
                message = error.message;
                code = error.code;
                break;
            default:
                message = 'Internal RPC Error.';
                code = -32603;

                if (Number.isInteger(error.code) && error.code < 0) {
                    // Assume this is a standard JSON RPC Error:
                    code = error.code;
                    message = error.message;
                } else {
                    // Assume an unexpected internal error:
                    this.#logger.error('caught error', { requestId, error });
                }
        }

        jsonResponse.error = { code, message };

        return response.respondWithJSON(200, jsonResponse);
    }

    /**
     * @public
     */
    async remoteProcedureCall(request, response) {
        const { href, protocol } = request.url;
        const env = this.#config.application.getEnvironment();

        // Redirect http: to https: (NOT in the development environment)
        if (protocol === 'http:' && env !== 'development') {
            const newLocation = href.replace(/^http:/, 'https:');
            return response.respondWithRedirect(301, newLocation);
        }

        await this.authenticateAdminUser(request);

        const jsonResponse = { jsonrpc: '2.0', id: null };

        let jsonRequest;
        try {
            jsonRequest = await request.json();
        } catch (error) {
            return this.handleError(error, request, response, jsonResponse);
        }

        const { id, method, params } = jsonRequest;

        // The "id" member must be a String or null.
        if (!isNonEmptyString(id) && id !== null) {
            const error = {
                code: -32600,
                message: `Invalid "id" member ${ toFriendlyString(id) }`,
            };
            return this.handleError(error, request, response, jsonResponse);
        }

        jsonResponse.id = id;

        // The "method" member must be a String.
        if (!isNonEmptyString(method)) {
            const error = {
                code: -32600,
                message: `Invalid "method" member ${ toFriendlyString(method) }`,
            };
            return this.handleError(error, request, response, jsonResponse);
        }

        // Constrain the RPC call to defined RPC methods.
        if (!this.allowedRPCMethods.includes(method) || !isFunction(this[method])) {
            const error = {
                code: -32601,
                message: `The method "${ method }" cannot be found.`,
            };
            return this.handleError(error, request, response, jsonResponse);
        }

        let result;
        try {
            // Use await to cast RPC results to a Promise.
            if (Array.isArray(params)) {
                result = await this[method](...params);
            } else {
                result = await this[method](params);
            }
        } catch (error) {
            return this.handleError(error, request, response, jsonResponse);
        }

        jsonResponse.result = result;
        return response.respondWithJSON(200, jsonResponse);
    }

    /**
     * Public remote procedure call (RPC) method.
     * @public
     */
    async createScopedToken(params) {
        if (!isPlainObject(params)) {
            const error = new Error(`Invalid params; expects plain object not ${ toFriendlyString(params) }`);
            error.code = -32602;
            throw error;
        }

        const { scopeId } = params;

        if (!isNonEmptyString(scopeId)) {
            const error = new Error(`Invalid scopeId; expects String not ${ toFriendlyString(scopeId) }`);
            error.code = -32602;
            throw error;
        }

        let scope = new Scope({ id: scopeId });
        scope = await this.#dataStore.fetch(scope);

        if (!scope) {
            scope = new Scope({ id: scopeId });
        }

        const newScope = scope.generateAuthenticationToken();
        await this.#dataStore.write(newScope);

        const { accessTokens } = newScope;
        return { scopeId, accessTokens };
    }

    /**
     * @private
     */
    authenticateAdminUser(request) {
        const session = new HTTPRequestSession({
            dataStore: this.#dataStore,
            request,
        });

        // Authenticate and authorize the user.
        return session.getAdminUser();
    }
}
