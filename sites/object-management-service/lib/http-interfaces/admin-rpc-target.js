import { KixxAssert } from '../../dependencies.js';

const {
    isFunction,
    isNonEmptyString,
    toFriendlyString,
} = KixxAssert;


export default class AdminRPCTarget {

    async remoteProcedureCall(request, response) {
        const jsonResponse = { jsonrpc: '2.0', id: null };

        let jsonRequest;
        try {
            jsonRequest = await request.json();
        } catch (err) {
            jsonResponse.error = {
                code: -32700,
                message: err.message,
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
        } catch (err) {
            let message = 'Internal RPC Error.';
            let code = -32603;

            if (Number.isInteger(err.code) && err.code < 0) {
                code = err.code;
                message = err.message;
            }

            jsonResponse.error = { code, message };

            return response.respondWithJSON(200, jsonResponse);
        }

        jsonResponse.result = result;
        return response.respondWithJSON(200, jsonResponse);
    }

    createScopedToken(params) {
        const { scopeId } = params;
        return { scopeId, tokens: [] };
    }
}
