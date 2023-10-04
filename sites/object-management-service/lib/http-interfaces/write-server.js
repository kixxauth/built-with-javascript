import { KixxAssert } from '../../dependencies.js';
import {
    UnauthorizedError,
    ForbiddenError,
    ValidationError } from '../errors.js';
import HTTPRequestSession from '../models/http-request-session.js';
import LocalObject from '../models/local-object.js';
import RemoteObject from '../models/remote-object.js';


const { assert } = KixxAssert;


export default class WriteServer {

    #logger = null;
    #dataStore = null;
    #objectStore = null;
    #localObjectStore = null;

    constructor({ logger, dataStore, objectStore, localObjectStore }) {
        this.#logger = logger.createChild({ name: 'WriteServer' });
        this.#dataStore = dataStore;
        this.#objectStore = objectStore;
        this.#localObjectStore = localObjectStore;
    }

    handleError(error, request, response) {
        const jsonResponse = { errors: [] };

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
                this.#logger.error('caught error', { error });
                // Do not return the error.message for privacy and security reasons.
                jsonResponse.errors.push({
                    status: 500,
                    code: error.code || 'INTERNAL_SERVER_ERROR',
                    title: error.name || 'InternalServerError',
                    detail: 'Unexpected internal server error.',
                });
        }

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

    async putObject(request, response) {
        const user = await this.authenticateScopeUser(request);
        const { scope } = user;
        const { key } = request.params;
        const contentType = request.headers.get('content-type');
        const storageClass = request.headers.get('x-kc-storage-class');

        assert(Array.isArray(key), 'Request.params.key expected to be an Array');

        let remoteObject = new RemoteObject({
            scopeId: scope.id,
            key: key.join('/'),
            contentType,
        });

        // Throws ValidationError
        remoteObject.validateForFetchHead();

        const localObject = new LocalObject({ scopeId: scope.id });

        // Stream the object content in parallel (don't await these Promises seperately).
        const [ nextRemoteObject, nextLocalObject ] = await Promise.all([
            this.#objectStore.fetchHead(remoteObject),
            this.#localObjectStore.write(localObject, request.readStream),
        ]);

        if (nextRemoteObject && nextRemoteObject.getEtag() === nextLocalObject.getEtag()) {
            this.#logger.log('putObject; etag match; skip upload');
            return response.respondWithJSON(200, { data: nextRemoteObject });
        }

        // eslint-disable-next-line require-atomic-updates
        remoteObject = nextRemoteObject || remoteObject;

        remoteObject = remoteObject
            .incorporateLocalObject(nextLocalObject)
            .setStorageClass(storageClass);

        this.#logger.log('putObject; no etag match; uploading', {
            id: remoteObject.id,
            etag: remoteObject.getEtag(),
            key: remoteObject.key,
            storageClass: remoteObject.storageClass,
        });

        this.run_backgroundJob(remoteObject).then((completedRemoteObject) => {
            // TODO: Remove local object.
            this.#logger.log('putObject; background job complete', {
                id: completedRemoteObject.id,
                etag: completedRemoteObject.getEtag(),
                key: completedRemoteObject.key,
                storageClass: completedRemoteObject.storageClass,
            });
        }).catch((error) => {
            this.#logger.error('putObject; background job error', {
                id: remoteObject.id,
                etag: remoteObject.getEtag(),
                key: remoteObject.key,
                storageClass: remoteObject.storageClass,
                error,
            });
        });

        return response.respondWithJSON(201, { data: remoteObject });
    }

    // Private - Using public notation to enable testing.
    async run_backgroundJob(remoteObject) {
        remoteObject.validateForPut();

        remoteObject = await this.#objectStore.put(remoteObject);

        console.log('Ready for video transcode:', remoteObject);

        // TODO: Handle video transcoding request.
        return remoteObject;
    }
}
