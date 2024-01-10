import Route from './route.js';

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
                message: 'HTTP method not allowed',
                data: {
                    detail: `HTTP "${ method }" method not allowed`,
                    allowedMethods,
                },
            },
        });
    }

    handleError(error, request, response) {
        return response.respondWithJSON(500, {
            jsonrpc: '2.0',
            id: null,
            error: {
                code: -32603,
                message: 'Internal error',
                data: {
                    detail: 'Unspecified internal server error',
                },
            },
        });
    }
}
