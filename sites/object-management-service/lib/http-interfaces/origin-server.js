import { KixxAssert } from '../../dependencies.js';
import RemoteObject from '../models/remote-object.js';

const { assert, isNonEmptyString } = KixxAssert;

const CACHE_CONTROL_VALUE = 'public, max-age=31536000';


export default class OriginServer {

    #logger = null;
    #objectStore = null;

    constructor({ logger, objectStore }) {
        this.#logger = logger.createChild({ name: 'OriginServer' });
        this.#objectStore = objectStore;
    }

    /**
     * @public
     */
    async serveObject(request, response) {
        const obj = this.createRemoteObjectFromRequest(request);

        const ifNoneMatch = request.headers.get('if-none-match');

        if (ifNoneMatch) {
            this.#logger.log('conditional request for', { scopeId: obj.scopeId, key: obj.key, ifNoneMatch });

            // Fetch the object head information, and potentially return a 304 Not Modified.
            const remoteObjectHead = await this.#objectStore.fetchHead(obj);

            if (!remoteObjectHead) {
                return response.respondWithPlainText(404, `URL ${ request.url.pathname } not found on this server.\n`);
            }

            if (remoteObjectHead.getEtag() === ifNoneMatch) {
                this.#logger.log('conditional request satisfied', { scopeId: obj.scopeId, key: obj.key, ifNoneMatch });
                response.headers.set('etag', remoteObjectHead.getEtag());
                response.headers.set('cache-control', CACHE_CONTROL_VALUE);
                return response.respondNotModified();
            }
        }

        this.#logger.log('serve object', { scopeId: obj.scopeId, key: obj.key });

        const result = await this.#objectStore.fetchObject(obj);

        if (!result) {
            return response.respondWithPlainText(404, `URL ${ request.url.pathname } not found on this server.\n`);
        }

        const [ remoteObject, readStream ] = result;

        response.headers.set('content-length', remoteObject.contentLength);
        response.headers.set('content-type', remoteObject.contentType);
        response.headers.set('cache-control', CACHE_CONTROL_VALUE);
        response.headers.set('etag', remoteObject.getEtag());

        response.body = readStream;

        return response;
    }

    /**
     * @public
     */
    async serveObjectMetadata(request, response) {
        const obj = this.createRemoteObjectFromRequest(request);

        this.#logger.log('serve object head', { scopeId: obj.scopeId, key: obj.key });

        const remoteObjectHead = await this.#objectStore.fetchHead(obj);

        if (!remoteObjectHead) {
            return response.respondWithPlainText(404, `URL ${ request.url.pathname } not found on this server.\n`);
        }

        response.headers.set('content-length', remoteObjectHead.contentLength);
        response.headers.set('content-type', remoteObjectHead.contentType);
        response.headers.set('cache-control', CACHE_CONTROL_VALUE);
        response.headers.set('etag', remoteObjectHead.getEtag());

        return response;
    }

    /**
     * @private
     */
    createRemoteObjectFromRequest(request) {
        assert(
            isNonEmptyString(request.params.scope),
            'Request.params.scope expected to a String');
        assert(
            Array.isArray(request.params.pathparts),
            'Request.params.pathparts expected to be an Array');

        const scopeId = request.params.scope;
        const { pathparts } = request.params;
        const filename = pathparts.pop();
        let version = pathparts.pop();

        if (version === 'latest') {
            version = null;
        }

        pathparts.push(filename);
        const key = pathparts.join('/');

        return new RemoteObject({
            scopeId,
            key,
            version,
        });
    }
}
