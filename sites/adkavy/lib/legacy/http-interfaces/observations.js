import { KixxAssert } from '../../dependencies.js';
import Observation from '../models/observation.js';
import ListObservationsPage from '../pages/list-observations-page.js';
import {
    ValidationError,
    NotFoundError,
    ConflictError,
    BadRequestError
} from '../errors.js';
// Bring this in when we're ready
// import ViewObservationPage from '../pages/view-observation-page.js';
import UploadMediaJob from '../jobs/upload-media-job.js';


const {
    isPlainObject,
    isNonEmptyString,
    isNumberNotNaN,
    assert,
} = KixxAssert;


export default class Observations {

    #logger = null;
    #eventBus = null;
    #dataStore = null;
    #blobStore = null;
    #templateStore = null;
    #objectManagementClient = null;
    #noCache = false;

    #pagesById = new Map();

    constructor(spec) {
        assert(isPlainObject(spec), 'isPlainObject');

        const {
            logger,
            eventBus,
            dataStore,
            blobStore,
            templateStore,
            objectManagementClient,
        } = spec;

        assert(logger);
        assert(eventBus);
        assert(dataStore);
        assert(blobStore);
        assert(templateStore);

        this.#logger = logger.createChild({ name: 'Observations' });
        this.#eventBus = eventBus;
        this.#dataStore = dataStore;
        this.#blobStore = blobStore;
        this.#templateStore = templateStore;
        this.#objectManagementClient = objectManagementClient;
        this.#noCache = Boolean(spec.noCache);
    }

    initialize() {
        this.#logger.info('initialize', { noCache: this.#noCache });
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

    viewObservation() {
    }

    async listObservations(request, response, options) {
        const pageId = options.page;
        const templateId = options.template;
        // TODO: Handle cache-control header.
        // const { cacheControl } = options;

        assert(isNonEmptyString(pageId), 'pageId isNonEmptyString');
        assert(isNonEmptyString(templateId), 'templateId isNonEmptyString');

        const page = await this.#getListItemsPage(pageId, templateId);

        const requestJSON = request.url.pathname.endsWith('.json');

        let json;
        let html;

        if (requestJSON) {
            json = await page.generateJSON(request);
        } else {
            html = await page.generateHTML(request);
        }

        // TODO: Handle HEAD request.

        if (json) {
            return response.respondWithJSON(200, json, { whiteSpace: true });
        }

        return response.respondWithHTML(200, html);
    }

    async createObservation(request, response) {
        const body = await request.json();

        // TODO: Validate JSON API input.
        // TODO: Either do not allow a user assigned ID, or check to ensure the observation
        //       record does not already exist.
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
        // The filename is only used to get the file extension.
        const { observationId, filename } = request.pathnameParams;
        const contentType = request.headers.get('content-type');
        const contentLength = parseInt(request.headers.get('content-length'), 10);

        assert(isNonEmptyString(observationId), 'observationId isNonEmptyString');
        assert(isNonEmptyString(filename), 'filename isNonEmptyString');
        assert(isNonEmptyString(contentType), 'content-type isNonEmptyString');
        assert(isNumberNotNaN(contentLength), 'content-length isNumberNotNaN');

        let observation = await this.#dataStore.fetch(new Observation({ id: observationId }));

        if (!observation) {
            throw new NotFoundError(`Observation ${ observationId } does not exist.`);
        }

        const job = new UploadMediaJob({
            logger: this.#logger,
            objectManagementClient: this.#objectManagementClient,
        });

        const existingMediaItems = observation.relationships.media || [];

        // TODO: Prevent uploading duplicate files by NOT using the media items index
        //       as a file name. Maybe use the hash instead?
        //       Or maybe filename + contentType + contentLength?
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
        const { observationId } = request.pathnameParams;
        // Cast the filename to the media id.
        const mediaId = request.pathnameParams.filename;

        assert(isNonEmptyString(observationId), 'observationId isNonEmptyString');
        assert(isNonEmptyString(mediaId), 'mediaId isNonEmptyString');

        const body = await request.json();

        if (!body || !body.data || !body.data.attributes) {
            throw new BadRequestError('JSON body.data.attributes must be an object');
        }

        let observation = await this.#dataStore.fetch(new Observation({ id: observationId }));

        if (!observation) {
            throw new NotFoundError(`Observation ${ observationId } does not exist.`);
        }

        observation = observation.updateMedia(mediaId, body.data.attributes);

        if (!observation) {
            throw new NotFoundError(`Observation media ${ mediaId } does not exist.`);
        }

        observation.validateBeforeSave();

        observation = await this.#dataStore.save(observation);

        const data = observation.getMediaItemById(mediaId);

        return response.respondWithJSON(200, { data });
    }

    #getListItemsPage(pageId, templateId) {
        // Use the existing page instance if it has already been created.
        if (this.#pagesById.has(pageId)) {
            return this.#pagesById.get(pageId);
        }

        const page = new ListObservationsPage({
            pageId,
            templateId,
            logger: this.#logger,
            eventBus: this.#eventBus,
            dataStore: this.#dataStore,
            blobStore: this.#blobStore,
            templateStore: this.#templateStore,
            noCache: this.#noCache,
        });

        // Stash the page instance by pageId to use later.
        this.#pagesById.set(pageId, page);

        // Returns a Promise.
        return page.initialize();
    }
}
