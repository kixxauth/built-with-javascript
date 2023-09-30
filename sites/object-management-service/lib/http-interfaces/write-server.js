import { UnauthorizedError, ForbiddenError } from '../errors.js';
import HTTPRequestSession from '../models/http-request-session.js';


export default class WriteServer {

    #logger = null;
    #dataStore = null;

    constructor({ logger, dataStore }) {
        this.#logger = logger.createChild({ name: 'WriteServer' });
        this.#dataStore = dataStore;
    }

    handleError(error, request, response) {
        const jsonResponse = { errors: [] };

        let status = 500;
        let code = 'INTERNAL_SERVER_ERROR';
        let title = 'InternalServerError';
        let detail = 'Unexpected internal server error.';

        switch (error.code) {
            case UnauthorizedError.CODE:
                status = 401;
                code = error.code;
                title = error.name;
                detail = error.message;
                break;
            case ForbiddenError.CODE:
                status = 403;
                code = error.code;
                title = error.name;
                detail = error.message;
                break;
            default:
                this.#logger.error('caught error', { error });

                if (error.name) {
                    title = error.name;
                }
                if (error.code) {
                    code = error.code;
                }
                // Do not return the error.message for privacy and security reasons.
        }

        jsonResponse.errors.push({
            status,
            code,
            title,
            detail,
        });

        return response.respondWithJSON(status, jsonResponse);
    }

    authenticateScopeUser(request) {
        const session = new HTTPRequestSession({
            dataStore: this.#dataStore,
            request,
        });

        // Authenticate and authorize the user.
        const scopeId = request.params.scope;
        return session.getScopedUser(scopeId);
    }

    // TODO: Add the response parameter back (removed to pass the linter).
    async putObject(request) {
        await this.authenticateScopeUser(request);
    }
}
