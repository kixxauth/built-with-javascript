import http from 'node:http';
import https from 'node:https';
import { KixxAssert } from '../../dependencies.js';
import { JSONParsingError } from '../errors.js';


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

        const { links } = result.data;
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
            id: result.data.id,
            contentType: result.data.contentType,
            contentLength: result.data.contentLength,
            md5Hash: result.data.md5Hash,
            version: result.data.version,
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

        console.log('==>> Make object service request', options);

        return new Promise((resolve, reject) => {
            const url = new URL(`/objects/${ this.#objectServiceScope }/${ key }`, this.#objectServiceEndpoint);
            const { protocol } = url;

            const reqOptions = {
                method: 'PUT',
                headers: {
                    authorization: `Bearer ${ this.#objectServiceToken }`,
                    'content-type': contentType,
                    'content-length': contentLength,
                    'x-kc-storage-class': 'STANDARD',
                },
            };

            if (processingParams) {
                const buff = Buffer.from(JSON.stringify(processingParams), 'utf8');
                reqOptions.headers['x-kc-video-processing'] = buff.toString('base64');
            }

            this.#logger.log('upload file', {
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

                    resolve(json);
                });
            });

            req.on('error', (error) => {
                this.#logger.error('object service request error', { error });
                reject(error);
            });

            sourceStream.pipe(req);
        });
    }
}
