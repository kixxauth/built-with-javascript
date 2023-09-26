import { KixxAssert } from '../../dependencies.js';
import { UnauthorizedError, ForbiddenError, JSONParsingError } from '../errors.js';
import HTTPRequestSession from '../http-request-session.js';

const {
    isFunction,
    isNonEmptyString,
    isPlainObject,
    toFriendlyString,
} = KixxAssert;


export default class AdminRPCTarget {

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
            case UnauthorizedError.CODE:
            case ForbiddenError.CODE:
                message = error.message;
                code = error.code;
                break;
            default:
                this.#logger.error('caught error', { error });
                message = 'Internal RPC Error.';
                code = -32603;
        }

        jsonResponse.error = { code, message };

        return response.respondWithJSON(200, jsonResponse);
    }

    async remoteProcedureCall(request, response) {
        const session = new HTTPRequestSession({
            dataStore: this.#dataStore,
            request,
        });

        const user = await session.getUser();

        const jsonResponse = { jsonrpc: '2.0', id: null };

        if (!user.isAdminUser()) {
            throw new ForbiddenError('user must have admin privileges');
        }

        let jsonRequest;
        try {
            jsonRequest = await request.json();
        } catch (error) {
            if (error.code === JSONParsingError.CODE) {
                jsonResponse.error = {
                    code: -32700,
                    message: error.message,
                };

                return response.respondWithJSON(200, jsonResponse);
            }

            this.#logger.error('error buffering request JSON body', { error });

            jsonResponse.error = {
                code: -32603,
                message: 'Internal RPC Error.',
            };

            return response.respondWithJSON(200, jsonResponse);
        }

        const { id, method, params } = jsonRequest;

        // The "id" member must be a String or null.
        if (!isNonEmptyString(id) && id !== null) {
            jsonResponse.error = {
                code: -32600,
                message: `Invalid "id" member ${ toFriendlyString(id) }`,
            };

            return response.respondWithJSON(200, jsonResponse);
        }

        jsonResponse.id = id;

        // The "method" member must be a String.
        if (!isNonEmptyString(method)) {
            jsonResponse.error = {
                code: -32600,
                message: `Invalid "method" member ${ toFriendlyString(method) }`,
            };

            return response.respondWithJSON(200, jsonResponse);
        }

        // If we allowed "remoteProcedureCall" we would end up in an infinite loop.
        if (method === 'remoteProcedureCall') {
            jsonResponse.error = {
                code: -32600,
                message: 'The "method" member cannot be "remoteProcedureCall"',
            };

            return response.respondWithJSON(200, jsonResponse);
        }

        if (!isFunction(this[method])) {
            jsonResponse.error = {
                code: -32601,
                message: `The method "${ method }" cannot be found.`,
            };

            return response.respondWithJSON(200, jsonResponse);
        }

        let result;
        try {
            if (Array.isArray(params)) {
                result = this[method](...params);
            } else {
                result = this[method](params);
            }
        } catch (error) {
            this.#logger.error('internal rpc error', { method, error });
            let message = 'Internal RPC Error.';
            let code = -32603;

            if (Number.isInteger(error.code) && error.code < 0) {
                code = error.code;
                message = error.message;
            }

            jsonResponse.error = { code, message };

            return response.respondWithJSON(200, jsonResponse);
        }

        jsonResponse.result = result;
        return response.respondWithJSON(200, jsonResponse);
    }

    createScopedToken(params) {
        if (!isPlainObject(params)) {
            const error = new Error(`Invalid params; expects JSON object not ${ toFriendlyString(params) }`);
            error.code = -32602;
            throw error;
        }

        const { scopeId } = params;

        if (!isNonEmptyString(scopeId)) {
            const error = new Error(`Invalid scopeId; expects String not ${ toFriendlyString(scopeId) }`);
            error.code = -32602;
            throw error;
        }

        return { scopeId, tokens: [] };
    }
}
