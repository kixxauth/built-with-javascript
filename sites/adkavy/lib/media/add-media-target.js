import Kixx from '../../kixx/mod.js';
import { KixxAssert } from '../../dependencies.js';
import UploadMediaJob from './upload-media-job.js';

const { assert, isNonEmptyString, isNumberNotNaN } = KixxAssert;

const { Target } = Kixx.Targets;
const { BadRequestError } = Kixx.Errors;


export default class ObservationsAddMedia extends Target {

    #dataStore = null;
    #objectManagementClient = null;

    constructor(settings) {
        const {
            name,
            methods,
            objectManagementClient,
        } = settings;

        super({ name, methods });

        this.#objectManagementClient = objectManagementClient;
    }

    async handleRequest(request, response) {
        const { filename } = request.url.pathnameParams;
        const contentType = request.headers.get('content-type');
        const contentLength = parseInt(request.headers.get('content-length'), 10);

        try {
            assert(isNonEmptyString(filename), 'filename isNonEmptyString');
            assert(isNonEmptyString(contentType), 'content-type isNonEmptyString');
            assert(isNumberNotNaN(contentLength), 'content-length isNumberNotNaN');
        } catch (error) {
            throw new BadRequestError(error.message);
        }

        const objectManagementClient = this.#objectManagementClient;
        const job = new UploadMediaJob({ objectManagementClient });

        const data = await job.uploadObservationAttachment(request.getReadStream(), {
            filename: decodeURIComponent(filename),
            contentType,
            contentLength,
        });

        return response.respondWithJSON(201, { data });
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
