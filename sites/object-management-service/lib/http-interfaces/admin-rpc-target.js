import { KixxAssert } from '../../dependencies.js';
import { UnauthorizedError, ForbiddenError, JSONParsingError } from '../errors.js';
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

    #logger = null;
    #dataStore = null;

    constructor({ logger, dataStore }) {
        this.#logger = logger.createChild({ name: 'AdminRPCTarget' });
        this.#dataStore = dataStore;
    }

    handleError(error, request, response) {
        const jsonResponse = { jsonrpc: '2.0', id: null };

        let message;
        let code;

        switch (error.code) {
            case JSONParsingError.CODE:
                code = -32700;
                message = error.message;
                break;
            case UnauthorizedError.CODE:
            case ForbiddenError.CODE:
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
                    this.#logger.error('caught error', { error });
                }
        }

        jsonResponse.error = { code, message };

        return response.respondWithJSON(200, jsonResponse);
    }

    authenticateAdminUser(request) {
        const session = new HTTPRequestSession({
            dataStore: this.#dataStore,
            request,
        });

        // Authenticate and authorize the user.
        return session.getAdminUser();
    }

    async remoteProcedureCall(request, response) {
        await this.authenticateAdminUser(request);

        const jsonResponse = { jsonrpc: '2.0', id: null };

        let jsonRequest;
        try {
            jsonRequest = await request.json();
        } catch (error) {
            return this.handleError(error, request, response);
        }

        const { id, method, params } = jsonRequest;

        // The "id" member must be a String or null.
        if (!isNonEmptyString(id) && id !== null) {
            const error = {
                code: -32600,
                message: `Invalid "id" member ${ toFriendlyString(id) }`,
            };
            return this.handleError(error, request, response);
        }

        jsonResponse.id = id;

        // The "method" member must be a String.
        if (!isNonEmptyString(method)) {
            const error = {
                code: -32600,
                message: `Invalid "method" member ${ toFriendlyString(method) }`,
            };
            return this.handleError(error, request, response);
        }

        // Constrain the RPC call to defined RPC methods.
        if (!this.allowedRPCMethods.includes(method) || !isFunction(this[method])) {
            const error = {
                code: -32601,
                message: `The method "${ method }" cannot be found.`,
            };
            return this.handleError(error, request, response);
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
            return this.handleError(error, request, response);
        }

        jsonResponse.result = result;
        return response.respondWithJSON(200, jsonResponse);
    }

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

        const scope = await Scope.fetch(this.#dataStore, scopeId);
        const newScope = scope.generateAuthenticationToken();

        await newScope.save(this.#dataStore);

        const { accessTokens } = newScope;
        return { scopeId, accessTokens };
    }
}
