import LocalObject from '../models/local-object.js';
import RemoteObject from '../models/remote-object.js';

export default class WriteObjectJob {

    scope = null;

    #logger = null;
    #objectStore = null;
    #localObjectStore = null;
    #mediaConvert = null;

    constructor(options) {
        const {
            logger,
            objectStore,
            localObjectStore,
            mediaConvert,
            scope,
        } = options;

        this.scope = scope;

        this.#logger = logger.createChild({ name: 'WriteObjectJob' });
        this.#objectStore = objectStore;
        this.#localObjectStore = localObjectStore;
        this.#mediaConvert = mediaConvert;
    }

    /**
     * @public
     */
    async putObject({ key, contentType, storageClass, readStream }) {
        let remoteObject = new RemoteObject({
            scopeId: this.scope.id,
            key,
            contentType,
        });

        // Throws ValidationError
        remoteObject.validateForFetchHead();

        const localObject = new LocalObject({ scopeId: this.scope.id });

        // Stream the object content in parallel (don't await these Promises seperately).
        const [ nextRemoteObject, nextLocalObject ] = await Promise.all([
            this.#objectStore.fetchHead(remoteObject),
            this.#localObjectStore.write(localObject, readStream),
        ]);

        if (nextRemoteObject && nextRemoteObject.getEtag() === nextLocalObject.getEtag()) {
            this.#logger.log('etag match; skip upload');

            this.#localObjectStore.removeStoredObject(nextLocalObject).catch((error) => {
                this.#logger.error('error while removing local cached object', { error });
            });

            return [ 200, nextRemoteObject ];
        }

        remoteObject = nextRemoteObject || remoteObject;

        remoteObject = remoteObject
            .incorporateLocalObject(nextLocalObject)
            // The storage class is not returned as part of an AWS S3 head request, so
            // the nextRemoteObject will not have it. Therefore, we set storageClass
            // here, after fetching the head, instead of earlier, before fetching the head.
            .setStorageClass(storageClass);

        // Throws ValidationError
        remoteObject.validateForPut();

        this.#logger.log('no etag match; will process object', {
            scopeId: remoteObject.scopeId,
            id: remoteObject.id,
            etag: remoteObject.getEtag(),
            key: remoteObject.key,
            storageClass: remoteObject.storageClass,
        });

        this.processObject(remoteObject).then(() => {
            return this.#localObjectStore.removeStoredObject(nextLocalObject);
        }).catch((error) => {
            this.#logger.error('error while processing object', { error });
        });

        return [ 201, remoteObject ];
    }

    /**
     * @private
     */
    processObject(remoteObject) {
        this.runBackgroundJob(remoteObject).then((completedRemoteObject) => {
            this.#logger.log('background job complete', {
                scopeId: completedRemoteObject.scopeId,
                id: completedRemoteObject.id,
                key: completedRemoteObject.key,
            });
        }).catch((error) => {
            this.#logger.error('background job error', {
                scopeId: remoteObject.scopeId,
                id: remoteObject.id,
                key: remoteObject.key,
                error,
            });
        });
    }

    /**
     * @private
     */
    async runBackgroundJob(remoteObject) {
        remoteObject = await this.#objectStore.put(remoteObject);

        // TODO: Check content type and video processing instructions before
        //       making a video transcode request.
        this.#logger.log('MediaConvert Job; creating', {
            scopeId: remoteObject.scopeId,
            id: remoteObject.id,
            key: remoteObject.key,
        });

        const job = await this.#mediaConvert.createMediaConvertJob(remoteObject);

        this.#logger.log('MediaConvert Job; created', {
            scopeId: remoteObject.scopeId,
            id: remoteObject.id,
            key: remoteObject.key,
            jobId: job.id,
        });

        return remoteObject;
    }
}
