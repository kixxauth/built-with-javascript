import { KixxAssert } from '../../dependencies.js';
import Observation from '../models/observation.js';
import {
    ValidationError,
    NotFoundError,
    ConflictError,
    BadRequestError
} from '../errors.js';
// Bring this in when we're ready
// import ViewObservationPage from '../pages/view-observation-page.js';
import UploadMediaJob from '../jobs/upload-media-job.js';
import { slugifyFilename } from '../utils.js';


const {
    isPlainObject,
    isNonEmptyString,
    isNumberNotNaN,
    assert,
} = KixxAssert;


export default class Observations {

    #logger = null;
    #dataStore = null;
    #viewObservationPage = null;

    constructor(spec) {
        assert(isPlainObject(spec), 'isPlainObject');

        const {
            logger,
            // Put these back when we actually need them.
            // eventBus,
            // pageDataStore,
            // pageSnippetStore,
            // templateStore,
            dataStore,
        } = spec;

        this.#logger = logger.createChild({ name: 'Observations' });
        this.#dataStore = dataStore;

        // Put this back when we actually start using it.
        // this.#viewObservationPage = new ViewObservationPage({
        //     logger,
        //     eventBus,
        //     pageDataStore,
        //     pageSnippetStore,
        //     templateStore,
        //     dataStore,
        // });
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
                    code: NotFoundError.CODE,
                    title: 'NotFoundError',
                    detail: error.message,
                });
                break;
            case ConflictError.CODE:
                status = 409;
                jsonResponse.errors.push({
                    status: 409,
                    code: ConflictError.CODE,
                    title: 'ConflictError',
                    detail: error.message,
                });
                break;
            case BadRequestError.CODE:
                status = 400;
                jsonResponse.errors.push({
                    status: 400,
                    code: BadRequestError.CODE,
                    title: 'BadRequestError',
                    detail: error.message,
                });
                break;
            default:
                this.#logger.error('caught unexpected error', { error });
                // Do not return the error.message for privacy and security reasons.
                jsonResponse.errors.push({
                    status: 500,
                    code: 'INTERNAL_SERVER_ERROR',
                    title: 'InternalServerError',
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

        // TODO: Validate JSON API input.
        let observation = Observation.fromJsonAPI(body.data).ensureId();

        observation.validateBeforeSave();

        observation = await this.#dataStore.save(observation);

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

        const body = await request.json();

        if (!body || !body.data || !body.data.attributes) {
            throw new BadRequestError('JSON body.data.attributes must be an object');
        }

        let observation = await this.#dataStore.fetch(new Observation({ id: observationId }));

        if (!observation) {
            throw new NotFoundError(`Observation ${ observationId } does not exist.`);
        }

        observation = observation.updateAttributes(body.data.attributes);
        observation.validateBeforeSave();

        observation = await this.#dataStore.save(observation);

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

        return response.respondWithJSON(200, {
            data,
            links,
            meta,
        });
    }

    async addMedia(request, response) {
        const { observationId } = request.pathnameParams;
        let { filename } = request.pathnameParams;
        const contentType = request.headers.get('content-type');
        const contentLength = parseInt(request.headers.get('content-length'), 10);

        assert(isNonEmptyString(observationId), 'observationId isNonEmptyString');
        assert(isNonEmptyString(filename), 'filename isNonEmptyString');
        assert(isNonEmptyString(contentType), 'content-type isNonEmptyString');
        assert(isNumberNotNaN(contentLength), 'content-length isNumberNotNaN');

        filename = slugifyFilename(filename);

        let observation = await this.#dataStore.fetch(new Observation({ id: observationId }));

        if (!observation) {
            throw new NotFoundError(`Observation ${ observationId } does not exist.`);
        }

        const job = new UploadMediaJob({
            logger: this.#logger,
            // TODO: We need some sort of client which is already configured.
            //       Then we use that client to create jobs.
            // config: this.#config,
        });

        const existingMediaItems = observation.relationships.media || [];

        const result = await job.uploadObservationAttachment(request.getReadStream(), {
            observationId,
            // The index for a new observation is the latest index + 1, which is .length:
            index: existingMediaItems.length,
            filename,
            contentType,
            contentLength,
        });

        if (!result) {
            // The object already exists and this was a no-op.
            return response.respondWithJSON(200, {});
        }

        observation = observation.addMediaFromMediaUploadJob(result);
        observation.validateBeforeSave();

        await this.#dataStore.save(observation);

        const allMedia = observation.relationships.media;
        const data = allMedia[allMedia.length - 1];

        return response.respondWithJSON(201, { data });
    }

    async updateMedia(request, response) {
        const { observationId, filename } = request.pathnameParams;

        assert(isNonEmptyString(observationId), 'observationId isNonEmptyString');
        assert(isNonEmptyString(filename), 'filename isNonEmptyString');

        const body = await request.json();

        if (!body || !body.data || !body.data.attributes) {
            throw new BadRequestError('JSON body.data.attributes must be an object');
        }

        let observation = await this.#dataStore.fetch(new Observation({ id: observationId }));

        if (!observation) {
            throw new NotFoundError(`Observation ${ observationId } does not exist.`);
        }

        observation = observation.updateMedia(filename, body.data.attributes);

        if (!observation) {
            throw new NotFoundError(`Observation media file ${ filename } does not exist.`);
        }

        observation.validateBeforeSave();

        await this.#dataStore.save(observation);

        const data = observation.getMediaItemByFilename(filename);

        return response.respondWithJSON(201, { data });
    }
}
