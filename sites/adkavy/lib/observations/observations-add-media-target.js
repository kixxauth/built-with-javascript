import Kixx from '../../kixx/mod.js';
import { KixxAssert } from '../../dependencies.js';
import ObservationModel from './observation-model.js';
import UploadMediaJob from './upload-media-job.js';

const { assert, isNonEmptyString, isNumberNotNaN } = KixxAssert;

const { Target } = Kixx.Targets;
const { BadRequestError, NotFoundError } = Kixx.Errors;


export default class ObservationsAddMedia extends Target {

    #dataStore = null;
    #objectManagementClient = null;

    constructor(settings) {
        const {
            name,
            methods,
            dataStore,
            objectManagementClient,
        } = settings;

        super({ name, methods });

        this.#dataStore = dataStore;
        this.#objectManagementClient = objectManagementClient;
    }

    async handleRequest(request, response) {
        const { observationId, filename } = request.url.pathnameParams;
        const contentType = request.headers.get('content-type');
        const contentLength = parseInt(request.headers.get('content-length'), 10);

        try {
            assert(isNonEmptyString(observationId), 'observationId isNonEmptyString');
            assert(isNonEmptyString(filename), 'filename isNonEmptyString');
            assert(isNonEmptyString(contentType), 'content-type isNonEmptyString');
            assert(isNumberNotNaN(contentLength), 'content-length isNumberNotNaN');
        } catch (error) {
            throw new BadRequestError(error.message);
        }

        const dataStore = this.#dataStore;

        let observation = await ObservationModel.load(dataStore, observationId);

        if (!observation) {
            throw new NotFoundError(`Observation ${ observationId } does not exist.`);
        }

        const objectManagementClient = this.#objectManagementClient;
        const job = new UploadMediaJob({ objectManagementClient });

        const result = await job.uploadObservationAttachment(request.getReadStream(), {
            observationId,
            filename,
            contentType,
            contentLength,
        });

        const existingMediaItem = observation.getMediaItemById(result.id);

        observation = observation.updateMediaItem({
            id: result.id,
            contentType: result.contentType,
            contentLength: result.contentLength,
            md5Hash: result.md5Hash,
            version: result.version,
            mediaOutput: result.mediaOutput,
            mediaURLs: result.mediaURLs,
            posterURLs: result.posterURLs,
        });

        observation = await observation.save(dataStore);

        const data = observation.getMediaItemById(result.id);
        const status = existingMediaItem ? 200 : 201;

        return response.respondWithJSON(status, { data });
    }

    handleError(error, request, response) {
        const jsonResponse = { errors: [] };

        let status = 500;

        switch (error.code) {
            case BadRequestError.CODE:
                status = 400;
                jsonResponse.errors.push({
                    status,
                    code: BadRequestError.CODE,
                    title: 'BadRequestError',
                    detail: error.message,
                });
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
            default:
                // Do not return the error.message for privacy and security reasons.
                jsonResponse.errors.push({
                    status,
                    code: 'INTERNAL_SERVER_ERROR',
                    title: 'InternalServerError',
                    detail: 'Unexpected internal server error.',
                });
        }

        return response.respondWithJSON(status, jsonResponse);
    }
}
