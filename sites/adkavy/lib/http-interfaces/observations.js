import { KixxAssert } from '../dependencies.js';
import { ValidationError } from '../errors.js';
import ViewObservationPage from '../pages/view-observation-page.js';

const { isPlainObject, assert } = KixxAssert;


export default class Observations {

    #logger = null;
    #viewObservationPage = null;

    constructor(spec) {
        assert(isPlainObject(spec), 'isPlainObject');

        const {
            logger,
            eventBus,
            pageDataStore,
            pageSnippetStore,
            templateStore,
        } = spec;

        this.#logger = logger.createChild({ name: 'Observations' });

        this.#viewObservationPage = new ViewObservationPage({
            logger,
            eventBus,
            pageDataStore,
            pageSnippetStore,
            templateStore,
        });
    }

    handleError(error, req, res) {
        const jsonResponse = { errors: [] };

        let status = 500;

        switch (error.code) {
            case ValidationError.CODE:
                status = 400;
                if (error.length > 0) {
                    error.forEach((err) => {
                        const jsonError = {
                            status: 400,
                            code: err.code || error.code,
                            title: error.name,
                            detail: err.message,
                        };

                        if (err.source) {
                            jsonError.source = err.source;
                        }

                        jsonResponse.errors.push(jsonError);
                    });
                } else {
                    jsonResponse.errors.push({
                        status: 400,
                        code: error.code,
                        title: error.name,
                        detail: error.message,
                    });
                }
                break;
            default:
                this.#logger.error('caught unexpected error', { error });
                // Do not return the error.message for privacy and security reasons.
                jsonResponse.errors.push({
                    status: 500,
                    code: error.code || 'INTERNAL_SERVER_ERROR',
                    title: error.name || 'InternalServerError',
                    detail: 'Unexpected internal server error.',
                });
        }

        return res.respondWithJSON(status, jsonResponse);
    }

    async viewObservation(req, res) {
        const id = req.pathnameParams.observationId;
        const page = this.#viewObservationPage;
        const requestJSON = req.url.pathname.endsWith('.json');

        if (requestJSON) {
            const json = await page.generateJSON({ id });
            return res.respondWithJSON(json);
        }

        const html = await page.generateHTML({ id });
        return res.respondWithHTML(html);
    }
}
