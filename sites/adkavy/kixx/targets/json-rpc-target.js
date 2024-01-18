import { KixxAssert } from '../../dependencies.js';
import Errors from '../errors/mod.js';
import Target from './target.js';

const {
    isFunction,
    isNonEmptyString,
    toFriendlyString,
} = KixxAssert;

const {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    JSONParsingError,
} = Errors;


export default class JsonRPCTarget extends Target {

    constructor(options) {
        const {
            name,
            methods,
            eventBus,
            remoteProcedureCalls,
        } = options;

        super({ name, methods });

        Object.defineProperties(this, {
            eventBus: {
                value: eventBus,
            },
            remoteProcedureCalls: {
                value: remoteProcedureCalls,
            },
        });
    }

    async handleRequest(request, response) {
        await this.authenticateUser(request);

        const jsonResponse = { jsonrpc: '2.0', id: null };

        // May throw a JSONParsingError
        const jsonRequest = await request.json();

        const { id, method, params } = jsonRequest;

        // The "id" member must be a String or null.
        if (!isNonEmptyString(id) && id !== null) {
            jsonResponse.error = {
                code: -32600,
                message: 'Invalid request',
                data: {
                    detail: `Invalid "id" member ${ toFriendlyString(id) }`,
                },
            };
            return response.respondWithJSON(200, jsonResponse);
        }

        jsonResponse.id = id;

        // The "method" member must be a String.
        if (!isNonEmptyString(method)) {
            jsonResponse.error = {
                code: -32600,
                message: 'Invalid request',
                data: {
                    detail: `Invalid "method" member ${ toFriendlyString(method) }`,
                },
            };
            return response.respondWithJSON(200, jsonResponse);
        }

        // Constrain the RPC call to defined RPC methods.
        if (!isFunction(this.remoteProcedureCalls[method])) {
            jsonResponse.error = {
                code: -32601,
                message: 'Method not found',
                data: {
                    detail: `The method "${ method }" cannot be found.`,
                },
            };
            return response.respondWithJSON(200, jsonResponse);
        }

        try {
            // Use await to cast RPC results to a Promise.
            if (Array.isArray(params)) {
                jsonResponse.result = await this.remoteProcedureCalls[method](...params);
            } else {
                jsonResponse.result = await this.remoteProcedureCalls[method](params);
            }
        } catch (error) {
            if (error.code === BadRequestError.CODE) {
                jsonResponse.error = {
                    code: -32602,
                    message: 'Invalid params',
                    detail: error.message,
                };
            } else {
                this.eventBus.emit('error', error);

                jsonResponse.error = {
                    code: -32603,
                    message: 'Internal error',
                    detail: 'Unspecified internal server error',
                };
            }
        }

        return response.respondWithJSON(200, jsonResponse);
    }

    /**
     * @private
     */
    authenticateUser() {
        // Override
    }

    handleError(error, request, response) {
        const jsonResponse = { jsonrpc: '2.0', id: null };

        let message;
        let code;
        let detail;

        switch (error.code) {
            case UnauthorizedError.CODE:
                code = 401;
                message = 'Authentication required';
                detail = error.message;
                break;
            case ForbiddenError.CODE:
                code = 403;
                message = 'User forbidden';
                detail = error.message;
                break;
            case JSONParsingError.CODE:
                code = -32700;
                message = 'Parse error';
                detail = error.message;
                break;
            default:
                code = -32603;
                message = 'Internal error';
                detail = 'Unspecified internal server error';
        }

        jsonResponse.error = { code, message, data: { detail } };

        return response.respondWithJSON(200, jsonResponse);
    }
}
