import { KixxAssert } from '../../dependencies.js';
import HTTPRequestSession from '../models/http-request-session.js';
import WriteObjectJob from '../jobs/write-object-job.js';
import {
    UnauthorizedError,
    ForbiddenError,
    ValidationError,
    UnprocessableError } from '../errors.js';


const { assert } = KixxAssert;


function filterFalsy(x) {
    return Boolean(x);
}


export default class WriteServer {

    #config = null;
    #logger = null;
    #dataStore = null;
    #objectStore = null;
    #localObjectStore = null;
    #mediaConvert = null;

    constructor(options) {
        const {
            config,
            logger,
            dataStore,
            objectStore,
            localObjectStore,
            mediaConvert,
        } = options;

        this.#config = config;
        this.#logger = logger.createChild({ name: 'WriteServer' });
        this.#dataStore = dataStore;
        this.#objectStore = objectStore;
        this.#localObjectStore = localObjectStore;
        this.#mediaConvert = mediaConvert;
    }

    /**
     * @public
     */
    handleError(error, request, response) {
        const jsonResponse = { errors: [] };

        const { requestId } = request;
        let status = 500;

        switch (error.code) {
            case UnauthorizedError.CODE:
                status = 401;
                jsonResponse.errors.push({
                    status: 401,
                    code: error.code,
                    title: error.name,
                    detail: error.message,
                });
                break;
            case ForbiddenError.CODE:
                status = 403;
                jsonResponse.errors.push({
                    status: 403,
                    code: error.code,
                    title: error.name,
                    detail: error.message,
                });
                break;
            case UnprocessableError.CODE:
                status = 422;
                jsonResponse.errors.push({
                    status: 422,
                    code: error.code,
                    title: error.name,
                    detail: error.message,
                });
                break;
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
                this.#logger.error('caught error', { requestId, error });
                // Do not return the error.message for privacy and security reasons.
                jsonResponse.errors.push({
                    status: 500,
                    // TODO: May not want to return the error.code for security reasons?
                    code: error.code || 'INTERNAL_SERVER_ERROR',
                    title: error.name || 'InternalServerError',
                    detail: 'Unexpected internal server error.',
                });
        }

        return response.respondWithJSON(status, jsonResponse);
    }

    /**
     * @public
     */
    async putObject(request, response) {
        const { href, protocol } = request.url;
        const env = this.#config.application.getEnvironment();

        // Redirect http: to https: (NOT in the development environment)
        // TODO: Set a seperate config for this like "redirectToHTTPS"
        if (protocol === 'http:' && env !== 'development') {
            const newLocation = href.replace(/^http:/, 'https:');
            return response.respondWithRedirect(301, newLocation);
        }

        const user = await this.authenticateScopeUser(request);
        const { requestId } = request;
        const { scope } = user;
        const contentType = request.headers.get('content-type');
        const contentLength = parseInt(request.headers.get('content-length'), 10);
        const storageClass = request.headers.get('x-kc-storage-class');

        assert(Array.isArray(request.params.key), 'Request.params.key expected to be an Array');

        // TODO: Validate key URL pathname parts to ensure safety and naming rules.
        const key = request.params.key.join('/');

        const writeObjectJob = new WriteObjectJob({
            logger: this.#logger,
            localObjectStore: this.#localObjectStore,
            objectStore: this.#objectStore,
            mediaConvert: this.#mediaConvert,
            requestId,
            scope,
        });

        // Throws ValidationError, UnprocessableError
        const [ status, remoteObject ] = await writeObjectJob.putObject({
            key,
            contentType,
            contentLength,
            storageClass,
            videoProcessingParams: this.#getVideoProcessingParams(request),
            readStream: request.getReadStream(),
        });

        const data = remoteObject.toJSON();

        // Create the resource links for this object.
        const { host } = request.url;
        const keyParts = data.key.split('/');
        const filename = keyParts.pop();
        const pathname = keyParts.join('/');
        const imgixBaseURL = this.#config.application.getImgixBaseURL();

        const originPath = [
            host,
            'origin',
            scope.id,
            pathname,
            'latest',
            filename,
        ].filter(filterFalsy).join('/');

        const cdnPath = [
            scope.id,
            pathname,
            'latest',
            filename,
        ].filter(filterFalsy).join('/');

        let mediaOriginPath;
        let mediaCDNPath;
        let mediaPosterOriginPath;
        let mediaPosterCDNPath;

        const { mediaOutput } = data;

        // Create the resource links for the output media if applicable.
        if (mediaOutput) {
            mediaOriginPath = [
                host,
                'origin',
                scope.id,
                mediaOutput.pathname,
                'latest',
                mediaOutput.videoFilename,
            ].filter(filterFalsy).join('/');

            mediaCDNPath = [
                scope.id,
                mediaOutput.pathname,
                'latest',
                mediaOutput.videoFilename,
            ].filter(filterFalsy).join('/');

            // Assume that if there is media output there is also a media poster output (JPEG image).
            mediaPosterOriginPath = [
                host,
                'origin',
                scope.id,
                mediaOutput.pathname,
                'latest',
                mediaOutput.posterFilename,
            ].filter(filterFalsy).join('/');

            mediaPosterCDNPath = [
                scope.id,
                mediaOutput.pathname,
                'latest',
                mediaOutput.posterFilename,
            ].filter(filterFalsy).join('/');
        }

        // Return the applicable resource links.
        data.links = {
            object: {
                origin: `${ protocol }//${ originPath }`,
                cdns: [ `${ imgixBaseURL }/${ cdnPath }` ],
            },
            mediaResource: {
                origin: mediaOriginPath ? `${ protocol }//${ mediaOriginPath }` : null,
                cdns: mediaCDNPath ? [ `${ imgixBaseURL }/${ mediaCDNPath }` ] : [],
            },
            mediaPoster: {
                origin: mediaPosterOriginPath ? `${ protocol }//${ mediaPosterOriginPath }` : null,
                cdns: mediaPosterCDNPath ? [ `${ imgixBaseURL }/${ mediaPosterCDNPath }` ] : [],
            },
        };

        return response.respondWithJSON(status, { data });
    }

    /**
     * @private
     */
    authenticateScopeUser(request) {
        const session = new HTTPRequestSession({
            dataStore: this.#dataStore,
            request,
        });

        // Authenticate and authorize the user.
        // TODO: Validate scopeId pathname param to ensure safety and naming rules.
        const scopeId = request.params.scope;
        return session.getScopedUser(scopeId);
    }

    /**
     * @private
     */
    #getVideoProcessingParams(request) {
        const str = request.headers.get('x-kc-video-processing');

        if (str) {
            try {
                const buff = Buffer.from(str, 'base64');
                const utf8 = buff.toString('utf8');
                return JSON.parse(utf8);
            } catch (cause) {
                const error = new ValidationError('Invalid x-kc-video-processing header', { cause });
                error.push('Invalid x-kc-video-processing header', 'x-kc-video-processing');
                throw error;
            }
        }

        return null;
    }
}
