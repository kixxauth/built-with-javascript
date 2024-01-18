import https from 'node:https';
import crypto from 'node:crypto'; // eslint-disable-line no-shadow
import { KixxAssert } from '../../dependencies.js';
import { OperationalError } from '../errors.js';
import { signRequest, hashSHA256HexDigest } from './sign-request.js';

const { assert, isNonEmptyString } = KixxAssert;

// SHA256 hash of an empty buffer
const EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';


// This S3 client is designed to work with small objects. Thus, it handles object data as
// buffers instead of streams.
export default class AwsS3Client {

    #logger = null;
    #s3Region = null;
    #s3AccessKey = null;
    #s3SecretKey = null;

    constructor(options) {
        const {
            logger,
            s3Region,
            s3AccessKey,
            s3SecretKey,
        } = options;

        assert(isNonEmptyString(s3Region), 'S3 region must be a non empty String');
        assert(isNonEmptyString(s3AccessKey), 'AWS accessKey must be a non empty String');
        assert(isNonEmptyString(s3SecretKey), 'AWS secretKey must be a non empty String');

        this.#logger = logger;
        this.#s3Region = s3Region;
        this.#s3AccessKey = s3AccessKey;
        this.#s3SecretKey = s3SecretKey;
    }

    async getObject(options, key) {
        assert(options, '; getObject() options must be provided');
        const { s3Bucket } = options;
        assert(isNonEmptyString(s3Bucket), '; options.s3Bucket must be a non empty String');

        const s3Endpoint = `https://${ s3Bucket }.s3.${ this.#s3Region }.amazonaws.com`;

        const method = 'GET';
        const url = new URL(key, s3Endpoint);

        this.#logger.info('get object', { url: url.href });

        const headers = signRequest(url, {
            method,
            payloadHash: EMPTY_HASH,
            region: this.#s3Region,
            accessKey: this.#s3AccessKey,
            secretKey: this.#s3SecretKey,
        });

        const res = await this.makeHttpRequest(url, null, {
            method,
            headers,
        });

        const { statusCode } = res;

        const buff = await this.bufferResponseData(res);

        if (statusCode !== 200) {
            // TODO: Interpret AWS S3 response with XML parser.
            const utf8 = buff.toString('utf8');

            if (utf8.includes('InvalidAccessKeyId')) {
                throw new OperationalError(
                    `GET object; unexpected S3 status code ${ statusCode }; InvalidAccessKeyId`,
                    { code: 'InvalidAccessKeyId' }
                );
            }

            if (utf8.includes('SignatureDoesNotMatch')) {
                throw new OperationalError(
                    `GET object; unexpected S3 status code ${ statusCode }; SignatureDoesNotMatch`,
                    { code: 'SignatureDoesNotMatch' }
                );
            }

            if (statusCode === 403) {
                return [ null, null ];
            }

            this.#logger.warn('get object; unexpected s3 status code', { statusCode, utf8 });
            throw new OperationalError(
                `GET object; unexpected S3 status code ${ statusCode }`,
                { code: statusCode }
            );
        }

        const lastModified = res.headers['last-modified']
            ? new Date(res.headers['last-modified'])
            : null;

        // Remove the double quotes if they exist.
        const etag = (res.headers.etag || '').replace(/^"|"$/g, '');

        const metdata = {
            contentType: res.headers['content-type'],
            lastModified,
            etag,
        };

        return [ metdata, buff ];
    }

    // - options      - { s3Bucket, s3StorageClass, contentType }
    // - key          - String
    // - contentType  - Mime String
    // - data         - Buffer
    async putObject(options, key, data) {
        assert(options, '; getObject() options must be provided');
        const { s3Bucket, contentType } = options;
        const s3StorageClass = options.s3StorageClass || 'STANDARD';
        assert(isNonEmptyString(s3Bucket), '; options.s3Bucket must be a non empty String');
        assert(isNonEmptyString(contentType), '; options.contentType must be a non empty String');

        const s3Endpoint = `https://${ s3Bucket }.s3.${ this.#s3Region }.amazonaws.com`;

        const method = 'PUT';
        const url = new URL(key, s3Endpoint);
        const contentLength = data.length;
        const md5Hash = md5HexDigest(data);

        this.#logger.info('put object', { url: url.href, contentType, contentLength });

        const headers = signRequest(url, {
            method,
            payloadHash: hashSHA256HexDigest(data),
            region: this.#s3Region,
            accessKey: this.#s3AccessKey,
            secretKey: this.#s3SecretKey,
            headers: {
                'content-type': contentType,
                'content-length': contentLength.toString(),
                'x-amz-storage-class': s3StorageClass,
            },
        });

        const res = await this.makeHttpRequest(url, data, {
            method,
            headers,
        });

        const { statusCode } = res;

        if (statusCode !== 200) {
            const buff = await this.bufferResponseData(res);

            // TODO: Interpret AWS S3 response with XML parser.
            const utf8 = buff.toString('utf8');

            if (utf8.includes('InvalidAccessKeyId')) {
                throw new OperationalError(
                    `PUT object; unexpected S3 status code ${ statusCode }; InvalidAccessKeyId`,
                    { code: 'InvalidAccessKeyId' }
                );
            }

            if (utf8.includes('SignatureDoesNotMatch')) {
                throw new OperationalError(
                    `PUT object; unexpected S3 status code ${ statusCode }; SignatureDoesNotMatch`,
                    { code: 'SignatureDoesNotMatch' }
                );
            }

            this.#logger.warn('put object; unexpected s3 status code', { statusCode, utf8 });
            throw new OperationalError(
                `PUT object; unexpected S3 status code ${ statusCode }`,
                { code: statusCode }
            );
        }

        // Remove the double quotes if they exist.
        const etag = (res.headers.etag || '').replace(/^"|"$/g, '');

        if (etag !== md5Hash) {
            this.#logger.error('put object; validation check failed', { md5Hash, etag });
            throw new OperationalError('PUT object; validation check failed');
        }

        return { etag };
    }

    /**
     * Allow private method override for testing.
     * @private
     */
    makeHttpRequest(url, data, options) {
        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                res.on('error', (error) => {
                    this.#logger.error('https response error event', { error });
                    reject(error);
                });

                resolve(res);
            });

            req.on('error', (error) => {
                this.#logger.error('https request error event', { error });
                reject(error);
            });

            if (data) {
                req.write(data);
            }

            req.end();
        });
    }

    /**
     * Allow private method override for testing.
     * @private
     */
    bufferResponseData(res) {
        return new Promise((resolve, reject) => {
            res.on('error', reject);

            const chunks = [];

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', (chunk) => {
                if (chunk) {
                    chunks.push(chunk);
                }
                resolve(Buffer.concat(chunks));
            });
        });
    }
}

function md5HexDigest(data) {
    const hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('hex');
}
