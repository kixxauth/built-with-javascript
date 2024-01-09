import Route from '../http/route.js';

export default class JsonRPCRoute extends Route {

    returnMethodNotAllowedResponse(request, response) {
        const { method } = request;
        const allowedMethods = this.getAllowedMethodsAsArray();

        response.headers.set('allowed', allowedMethods.join(', '));

        return response.respondWithJSON(405, {
            jsonrpc: '2.0',
            id: null,
            error: {
                code: 405,
                message: `"${ method }" method not allowed`,
                data: { allowedMethods },
            },
        });
    }

    handleError(error, request, response) {
        return response.respondWithJSON(500, {
            jsonrpc: '2.0',
            id: null,
            error: {
                code: -32000,
                message: 'Internal server error',
            },
        });
    }
}
