import http from 'node:http';
import https from 'node:https';
import { KixxAssert } from '../../dependencies.js';
import { OperationalError, JSONParsingError } from '../errors.js';


const { assert, isNonEmptyString } = KixxAssert;


export default class UploadMediaJob {

    #logger = null;

    #objectServiceEndpoint = null;
    #objectServiceScope = null;
    #objectServiceToken = null;

    constructor({ logger, config }) {
        this.#logger = logger.createChild({ name: 'UploadMediaJob' });

        this.#objectServiceEndpoint = config.objectService.getEndpoint();
        this.#objectServiceScope = config.objectService.getScope();
        this.#objectServiceToken = config.objectService.getToken();

        assert(isNonEmptyString(this.#objectServiceEndpoint));
        assert(isNonEmptyString(this.#objectServiceScope));
        assert(isNonEmptyString(this.#objectServiceToken));
    }

    async uploadObservationAttachment(sourceStream, options) {
        const {
            observationId,
            index,
            filename,
            contentType,
            contentLength,
        } = options;

        const ext = filename.split('.').pop();
        let key = `observations/${ observationId }/${ ('000' + index).slice(-3) }`;

        if (ext) {
            key = `${ key }.${ ext }`;
        }

        const processingParams = {
            type: 'MP4_H264_AAC',
            video: {
                height: 720,
                qualityLevel: 7,
                maxBitrate: 2000000,
            },
            audio: {},
        };

        const result = await this.#makeRequest(sourceStream, {
            contentType,
            contentLength,
            key,
            processingParams,
        });

        const { statusCode, body } = result;

        if (statusCode !== 201) {
            // The only case we care about is a new object being uploaded and processed,
            // which should always return a 201.
            //
            // If the object already exists, and the etag matches then the object management
            // service will respond with a 200, indicating a no-op.
            return null;
        }

        if (Array.isArray(body.errors)) {
            for (const error of body.errors) {
                this.#logger.error('object service response error', error);
            }

            throw new OperationalError('Unexpected object service response error');
        }

        let objectStorageRecord;
        if (body.data) {
            objectStorageRecord = body.data;
        } else {
            throw new OperationalError('Unexpected object service response shape');
        }

        const { links } = objectStorageRecord;

        let mediaURLs;
        let posterURLs;

        if (links.mediaResource && links.mediaResource.origin) {
            mediaURLs = {
                origin: links.mediaResource.origin,
                cdns: links.mediaResource.cdns || [],
            };
        } else {
            mediaURLs = {
                origin: links.object.origin,
                cdns: links.object.cdns,
            };
        }

        if (links.mediaPoster && links.mediaPoster.origin) {
            posterURLs = {
                origin: links.mediaPoster.origin,
                cdns: links.mediaPoster.cdns || [],
            };
        } else {
            posterURLs = null;
        }

        return {
            id: objectStorageRecord.id,
            filename,
            contentType: objectStorageRecord.contentType,
            contentLength,
            md5Hash: objectStorageRecord.md5Hash,
            version: objectStorageRecord.version,
            mediaURLs,
            posterURLs,
        };
    }

    #makeRequest(sourceStream, options) {
        const {
            contentType,
            contentLength,
            key,
            processingParams,
        } = options;

        return new Promise((resolve, reject) => {
            const url = new URL(`/objects/${ this.#objectServiceScope }/${ key }`, this.#objectServiceEndpoint);
            const { protocol } = url;
            const method = 'PUT';

            const reqOptions = {
                method,
                headers: {
                    authorization: `Bearer ${ this.#objectServiceToken }`,
                    'content-type': contentType,
                    'content-length': contentLength,
                    'x-kc-storage-class': 'STANDARD',
                },
                // Required to get around the certificate authority for the *.kixx.name SSL cert.
                rejectUnauthorized: false,
            };

            if (processingParams) {
                const buff = Buffer.from(JSON.stringify(processingParams), 'utf8');
                reqOptions.headers['x-kc-video-processing'] = buff.toString('base64');
            }

            this.#logger.log('object service request', {
                method,
                url: url.href,
                contentType,
                contentLength,
                processingParams: Boolean(processingParams),
            });

            const proto = protocol === 'https:' ? https : http;

            const req = proto.request(url, reqOptions, (res) => {
                const chunks = [];

                res.on('error', (error) => {
                    this.#logger.error('object service response error', { error });
                    reject(error);
                });

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    const utf8 = Buffer.concat(chunks).toString('utf8');
                    let json;
                    try {
                        json = JSON.parse(utf8);
                    } catch (cause) {
                        reject(new JSONParsingError(
                            `Error parsing object service response JSON: ${ cause.message }`,
                            { cause }
                        ));
                        return;
                    }

                    resolve({
                        statusCode: res.statusCode,
                        body: json,
                    });
                });
            });

            req.on('error', (error) => {
                this.#logger.error('object service request error', { error });

                reject(new OperationalError(
                    'Could not connect to the object service',
                    { code: error.code, cause: error }
                ));

                // This code used to treat all request errors as fatal, except for connection errors.
                // However, we only need to treat errors which could leave the system in a bad state
                // as fatal. Not sure this is a good candidate. TBD?
                // if (error.code === 'ECONNREFUSED') {
                //     reject(new OperationalError(
                //         'Could not connect to the object service',
                //         { code: error.code, cause: error }
                //     ));
                // } else {
                //     reject(error);
                // }
            });

            sourceStream.pipe(req);
        });
    }
}
