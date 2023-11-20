import { KixxAssert } from '../../dependencies.js';
import Observation from '../models/observation.js';
import { ValidationError, NotFoundError, ConflictError } from '../errors.js';
import ViewObservationPage from '../pages/view-observation-page.js';
import UploadMediaJob from '../jobs/upload-media-job.js';


const { isPlainObject, isNonEmptyString, assert } = KixxAssert;


export default class Observations {

    #logger = null;
    #config = null;
    #datastore = null;
    #viewObservationPage = null;

    constructor(spec) {
        assert(isPlainObject(spec), 'isPlainObject');

        const {
            logger,
            config,
            eventBus,
            pageDataStore,
            pageSnippetStore,
            templateStore,
            datastore,
        } = spec;

        this.#logger = logger.createChild({ name: 'Observations' });
        this.#config = config;
        this.#datastore = datastore;

        this.#viewObservationPage = new ViewObservationPage({
            logger,
            eventBus,
            pageDataStore,
            pageSnippetStore,
            templateStore,
            datastore,
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
            case NotFoundError.CODE:
                status = 404;
                jsonResponse.errors.push({
                    status: 404,
                    code: error.code || 'NOT_FOUND_ERROR',
                    title: 'NotFoundError',
                    detail: error.message,
                });
                break;
            case ConflictError.CODE:
                status = 409;
                jsonResponse.errors.push({
                    status: 409,
                    code: error.code || 'CONFLICT_ERROR',
                    title: 'ConflictError',
                    detail: error.message,
                });
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
        assert(isNonEmptyString(id), 'observationId isNonEmptyString');
        const page = this.#viewObservationPage;
        const requestJSON = req.url.pathname.endsWith('.json');

        if (requestJSON) {
            const json = await page.generateJSON({ id });
            return res.respondWithJSON(json);
        }

        // TODO: Handle HEAD requests.
        // TODO: Set cache-control header.

        const html = await page.generateHTML({ id });
        return res.respondWithHTML(html);
    }

    listObservations() {
    }

    async createObservation(request, response) {
        const body = await request.json();

        let observation = Observation.fromJsonAPI(body.data).ensureId();

        observation.validateBeforeSave();

        observation = await this.#datastore.save(observation);

        const {
            type,
            id,
            attributes,
            relationships,
            meta,
            links,
        } = observation.toJsonAPI();

        const data = {
            type,
            id,
            attributes,
            relationships,
        };

        return response.respondWithJSON(201, {
            data,
            links,
            meta,
        });
    }

    async updateObservation(request, response) {
        const { observationId } = request.pathnameParams;

        assert(isNonEmptyString(observationId), 'observationId isNonEmptyString');

        const patch = await request.json();
        let observation = await this.#datastore.fetch(new Observation({ id: observationId }));

        if (!observation) {
            throw new NotFoundError(`Observation ${ observationId } does not exist.`);
        }

        observation = observation.update(patch);
        observation.validateBeforeSave();

        await this.#datastore.save(observation);

        return response.respondWithJSON(200, observation.toObject());
    }

    async addMedia(request, response) {
        const { observationId, mediaId } = request.pathnameParams;

        assert(isNonEmptyString(observationId), 'observationId isNonEmptyString');

        let observation = await this.#datastore.fetch(new Observation({ id: observationId }));

        const job = new UploadMediaJob({
            logger: this.#logger,
            config: this.#config,
        });

        const result = await job.uploadObservationAttachment(request.getReadStream(), {
            observationId,
            // The index for a new observation is the latest index + 1, which is .length:
            index: observation.attributes.media.length,
            filename: mediaId,
        });

        console.log('==>> uploadObservationAttachment() result', result);

        observation = observation.addMedia(result);
        observation.validateBeforeSave();

        console.log('==>> uploadObservationAttachment() observation', observation);

        await this.#datastore.save(observation);

        const allMedia = observation.toObject().media;

        return response.respondWithJSON(201, allMedia[allMedia.length - 1]);
    }

    async updateMedia(request, response) {
        const { observationId, mediaId } = request.pathnameParams;

        assert(isNonEmptyString(observationId), 'observationId isNonEmptyString');
        assert(isNonEmptyString(mediaId), 'observationId isNonEmptyString');

        const patch = await request.json();
        let observation = await this.#datastore.fetch(new Observation({ id: observationId }));

        observation = observation.updateMedia(mediaId, patch);
        observation.validateBeforeSave();

        await this.#datastore.save(observation);

        const allMedia = observation.toObject().media;

        const mediaItem = allMedia.find((item) => {
            return item.id === mediaId;
        });

        return response.respondWithJSON(200, mediaItem);
    }
}
