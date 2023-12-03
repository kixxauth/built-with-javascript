import { KixxAssert } from '../../dependencies.js';
import { OperationalError, ValidationError, UnprocessableError } from '../errors.js';
import LocalObject from '../models/local-object.js';
import RemoteObject from '../models/remote-object.js';

const { isNumberNotNaN } = KixxAssert;


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
            requestId,
        } = options;

        this.scope = scope;
        this.requestId = requestId;

        this.#logger = logger.createChild({ name: 'WriteObjectJob' });
        this.#objectStore = objectStore;
        this.#localObjectStore = localObjectStore;
        this.#mediaConvert = mediaConvert;
    }

    /**
     * @public
     */
    async putObject(args) {
        const {
            key,
            contentType,
            storageClass,
            videoProcessingParams,
            readStream,
        } = args;

        const { requestId, scope } = this;

        let remoteObject = new RemoteObject({
            scopeId: scope.id,
            key,
            contentType,
        });

        // Throws ValidationError
        remoteObject.validateForFetchHead();
        this.#validateVideoProcessingParams(videoProcessingParams);

        const localObject = new LocalObject({ scopeId: this.scope.id });

        // Stream the object content in parallel (don't await these Promises seperately).
        const [ nextRemoteObject, nextLocalObject ] = await Promise.all([
            this.#objectStore.fetchHead(remoteObject),
            this.#localObjectStore.write(localObject, readStream),
        ]);

        const etag = nextLocalObject.getEtag();

        if (nextRemoteObject && nextRemoteObject.getEtag() === etag) {
            this.#logger.log('etag match; skip upload', { requestId });

            this.#localObjectStore.removeStoredObject(nextLocalObject).catch((error) => {
                this.#logger.error('error while removing local cached object', { error });
            });

            return [ 200, nextRemoteObject ];
        }

        // eslint-disable-next-line require-atomic-updates
        remoteObject = nextRemoteObject || remoteObject;

        remoteObject = remoteObject
            .incorporateLocalObject(nextLocalObject)
            // The contentType and storage class is not returned as part of an AWS S3 head request, so
            // the nextRemoteObject will not have it. Therefore, we set contentType and storageClass
            // here, after fetching the head, instead of earlier, before fetching the head.
            .setStorageClass(storageClass)
            .setContentType(contentType);

        // Only create a media processing job if the object represents a video source AND
        // video processing parameters have been passed.
        const processVideo = remoteObject.isVideoSource() && videoProcessingParams;

        try {
            // Throws ValidationError
            remoteObject.validateForPut();

            // Cannot process video stored with anything other than the STANDARD storage class.
            if (processVideo && remoteObject.storageClass !== 'STANDARD') {
                throw new UnprocessableError(
                    `Cannot process video for storage class: ${ remoteObject.storageClass }`
                );
            }
        } catch (error) {
            await this.#localObjectStore.removeStoredObject(nextLocalObject);
            throw error;
        }

        this.#logger.log('no etag match; will process object', {
            requestId,
            scopeId: remoteObject.scopeId,
            id: remoteObject.id,
            etag,
            key: remoteObject.key,
            storageClass: remoteObject.storageClass,
        });

        // Uploading the object to S3 and creating the MediaConvert job does take some time, making
        // this request/response cycle a long one. However, running the request as a complete
        // transaction simplifies the logic for both the server and clients.
        //
        // Also, note that we don't wait for the MediaConvert job to complete.

        // Upload the object to S3.
        // eslint-disable-next-line require-atomic-updates
        remoteObject = await this.#objectStore.put(remoteObject);

        // Remove the locally stored object after it has been uploaded.
        await this.#localObjectStore.removeStoredObject(nextLocalObject);

        if (remoteObject.getEtag() !== etag) {
            this.#logger.error('local md5 hash does not match s3', { etag, s3Etag: remoteObject.getEtag() });
            throw new OperationalError('Local MD5 hash does not match S3');
        }

        if (processVideo) {
            this.#logger.log('process object as video', {
                requestId,
                scopeId: remoteObject.scopeId,
                id: remoteObject.id,
                key: remoteObject.key,
            });

            // eslint-disable-next-line require-atomic-updates
            remoteObject = await this.createVideoProcessingJob(remoteObject, videoProcessingParams);
        }

        return [ 201, remoteObject ];
    }

    /**
     * @private
     */
    async createVideoProcessingJob(remoteObject, videoProcessingParams) {
        const { requestId } = this;

        this.#logger.log('MediaConvert Job; creating', {
            requestId,
            scopeId: remoteObject.scopeId,
            id: remoteObject.id,
            key: remoteObject.key,
        });

        const job = await this.#mediaConvert.createMediaConvertJob(remoteObject, videoProcessingParams);

        this.#logger.log('MediaConvert Job; created', {
            requestId,
            scopeId: remoteObject.scopeId,
            id: remoteObject.id,
            key: remoteObject.key,
            jobId: job.id,
        });

        return remoteObject.updateFromMediaConvertJob(job);
    }

    /**
     * @private
     */
    #validateVideoProcessingParams(params) {
        // Video processing params can be falsy.
        if (params) {
            // But if the params object is truthy, then validate the parameters.
            const error = new ValidationError('Video processing parameters validation error');

            // For now, we only accept 1 video processing type:
            //   (an MP4 file with H264 video and AAC audio).
            if (params.type !== 'MP4_H264_AAC') {
                error.push('Video processing type must be "MP4_H264_AAC"', '.type');
            }

            if (params.video) {
                if (params.video.height) {
                    if (!isNumberNotNaN(params.video.height) || params.video.height < 360 || params.video.height > 2160) {
                        error.push('Video processing video.height must be a number from 360 to 2160', '.video.height');
                    }
                } else {
                    params.video.height = 480;
                }
                if (params.video.qualityLevel) {
                    if (!isNumberNotNaN(params.video.qualityLevel) || params.video.qualityLevel < 1 || params.video.qualityLevel > 10) {
                        error.push('Video processing video.qualityLevel must be a number from 1 to 10', '.video.qualityLevel');
                    }
                } else {
                    params.video.qualityLevel = 7;
                }
                if (params.video.maxBitrate) {
                    if (!isNumberNotNaN(params.video.maxBitrate) || params.video.maxBitrate < 100000 || params.video.maxBitrate > 9000000) {
                        error.push('Video processing video.maxBitrate must be a number from 100,000 to 9,000,000', '.video.maxBitrate');
                    }
                }
            } else {
                params.video = {
                    height: 480,
                    qualityLevel: 7,
                    maxBitrate: 1000000,
                };
            }

            // Throw the ValidationError if we caught any video processing param validation problems.
            if (error.length > 0) {
                throw error;
            }
        }

        return params;
    }
}
