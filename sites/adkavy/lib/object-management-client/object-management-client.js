import http from 'node:http';
import https from 'node:https';
import { KixxAssert } from '../../dependencies.js';
import Kixx from '../../kixx/mod.js';

const { OperationalError, JSONParsingError } = Kixx.Errors;
const { assert, isNonEmptyString } = KixxAssert;


export default class ObjectManagementClient {

    #logger = null;
    #objectServiceEndpoint = null;
    #objectServiceScope = null;
    #objectServiceToken = null;

    constructor(options) {
        const {
            logger,
            objectServiceEndpoint,
            objectServiceScope,
            objectServiceToken,
        } = options;

        assert(isNonEmptyString(objectServiceEndpoint));
        assert(isNonEmptyString(objectServiceScope));
        assert(isNonEmptyString(objectServiceToken));

        this.#logger = logger;

        this.#objectServiceEndpoint = objectServiceEndpoint;
        this.#objectServiceScope = objectServiceScope;
        this.#objectServiceToken = objectServiceToken;
    }

    async uploadMedia(sourceStream, options) {
        const {
            contentType,
            contentLength,
            key,
            processingParams,
        } = options;

        const result = await this.#makeRequest(sourceStream, {
            contentType,
            contentLength,
            key,
            processingParams,
        });

        const { body } = result;

        if (Array.isArray(body.errors)) {
            for (const error of body.errors) {
                this.#logger.error('object service response error', error);
            }

            throw new OperationalError('Unexpected object service response error');
        }

        if (body.data) {
            return body.data;
        }

        throw new OperationalError('Unexpected object service response shape');

        /* Dump of body.data =>
        {
            "type": "remote-object",
            "id": "56cadbd0-166a-4b52-a12e-7ada1583b672",
            "scopeId": "adkavy",
            "key": "testing/a-video.mov",
            "contentType": "video/quicktime",
            "contentLength": 6699955,
            "storageClass": "STANDARD",
            "md5Hash": "0aea39424f4afbe7eea3c8867115ba7e",
            "sha256Hash": "b316e1d54542ed0db632204660b7aabee914e0032af8de1fa8cb9a58ce52eb18",
            "version": "sqiMsP3QzFUbCz6Vk_FeSfbpYFur.zGm",
            "lastModifiedDate": "2023-12-11T11:23:36.909Z",
            "mediaOutput": {
                "format": "MP4_H264_AAC",
                "pathname": "56cadbd0-166a-4b52-a12e-7ada1583b672",
                "videoFilename": "video.mp4",
                "posterFilename": "video.0000000.jpg"
            },
            "links": {
                "object": {
                    "origin": "https://media.kixx.name/origin/adkavy/testing/latest/a-video.mov",
                    "cdns": [
                        "https://kixx.imgix.net/adkavy/testing/latest/a-video.mov"
                    ]
                },
                "mediaResource": {
                    "origin": "https://media.kixx.name/origin/adkavy/56cadbd0-166a-4b52-a12e-7ada1583b672/latest/video.mp4",
                    "cdns": [
                        "https://kixx.imgix.net/adkavy/56cadbd0-166a-4b52-a12e-7ada1583b672/latest/video.mp4"
                    ]
                },
                "mediaPoster": {
                    "origin": "https://media.kixx.name/origin/adkavy/56cadbd0-166a-4b52-a12e-7ada1583b672/latest/video.0000000.jpg",
                    "cdns": [
                        "https://kixx.imgix.net/adkavy/56cadbd0-166a-4b52-a12e-7ada1583b672/latest/video.0000000.jpg"
                    ]
                }
            }
        }
         */
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

                // This block of code will treat all request errors as fatal, except for connection errors.
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
