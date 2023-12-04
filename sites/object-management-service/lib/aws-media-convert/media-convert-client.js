import https from 'node:https';
import { OperationalError } from '../errors.js';
import { SignAWSRequest } from '../../dependencies.js';

const { signRequest, hashSHA256HexDigest, headersToPlainObject } = SignAWSRequest;


export default class MediaConvertClient {

    #logger = null;
    #awsAccessKeyId = null;
    #awsSecretKey = null;
    #awsRegion = null;
    #awsMediaConvertEndpoint = null;
    #service = 'mediaconvert';
    #serviceVersion = '2017-08-29';

    constructor(options) {
        this.#logger = options.logger;
        this.#awsAccessKeyId = options.awsAccessKeyId;
        this.#awsSecretKey = options.awsSecretKey;
        this.#awsRegion = options.awsRegion;
        this.#awsMediaConvertEndpoint = options.awsMediaConvertEndpoint;
    }

    /**
     * @public
     */
    async getJob(id) {
        const pathname = `/${ this.#serviceVersion }/jobs/${ id }`;
        const result = await this.#makeRequest('GET', pathname, '');
        return result.json.job;
    }

    /**
     * @public
     */
    async createJob(spec) {
        const pathname = `/${ this.#serviceVersion }/jobs`;
        const result = await this.#makeRequest('POST', pathname, JSON.stringify(spec));

        const { statusCode } = result;

        if (statusCode !== 201) {
            this.#logger.error('unable to create mediaconvert job', { statusCode, utf8: result.utf8 });
            throw new OperationalError('Unable to create MediaConvert job');
        }

        return result.json;
    }

    /**
     * @private
     */
    #makeRequest(method, pathname, body) {
        const url = new URL(pathname, this.#awsMediaConvertEndpoint);

        const awsOptions = {
            accessKey: this.#awsAccessKeyId,
            secretKey: this.#awsSecretKey,
            region: this.#awsRegion,
            service: this.#service,
        };

        const requestOptions = { method, url };

        const hash = hashSHA256HexDigest(body);
        const headers = signRequest(awsOptions, requestOptions, hash);

        const options = {
            method,
            headers: headersToPlainObject(headers),
        };

        return this.#makeHttpsRequest(url, options, body);
    }

    /**
     * @private
     */
    #makeHttpsRequest(url, options, body) {
        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                const chunks = [];

                res.once('error', reject);

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    req.off('error', reject);
                    res.off('error', reject);

                    const utf8 = Buffer.concat(chunks).toString('utf8');

                    let json;
                    try {
                        json = JSON.parse(utf8);
                    } catch (e) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            json: null,
                            utf8,
                        });

                        return;
                    }

                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        json,
                        utf8,
                    });
                });
            });

            req.once('error', reject);

            if (typeof body === 'string' || body) {
                req.write(body);
            }

            req.end();
        });
    }
}
