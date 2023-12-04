import https from 'node:https';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { OperationalError } from './errors.js';
import { KixxAssert, SignAWSRequest } from '../dependencies.js';


const {
    isNonEmptyString,
    isNumberNotNaN,
    assert,
    assertFalsy,
    assertIncludes } = KixxAssert;


const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];

const S3_STORAGE_CLASS_MAPPING = {
    STANDARD: 'STANDARD_IA',
    INFREQUENT_ACCESS: 'GLACIER_IR',
};

// Only allow word characters and "-" in key "filenames".
// eslint-disable-next-line no-useless-escape
const ALLOWED_KEY_PATH_RX = /^[\w\-\.]+$/;


export default class ObjectStore {

    #logger = null;
    #s3Client = null;
    #s3BucketName = null;
    #s3Endpoint = null;
    #s3Options = null;
    #environment = null;

    static get STORAGE_CLASS_MAPPING() {
        return Object.freeze(S3_STORAGE_CLASS_MAPPING);
    }

    constructor({ logger, config }) {
        const region = config.objectStore.getRegion();
        const bucketName = config.objectStore.getBucketName();
        const environment = config.objectStore.getEnvironment();
        const accessKeyId = config.objectStore.getAccessKeyId();
        const secretAccessKey = config.objectStore.getSecretAccessKey();

        assert(isNonEmptyString(region), 'AWS region must be a non empty String');
        assert(isNonEmptyString(bucketName), 'AWS bucketName must be a non empty String');
        assertIncludes(
            environment,
            ALLOWED_ENVIRONMENTS,
            `DataStore environment must be one of "${ ALLOWED_ENVIRONMENTS.join('","') }"`
        );
        assert(isNonEmptyString(accessKeyId), 'AWS accessKeyId must be a non empty String');
        assert(isNonEmptyString(secretAccessKey), 'AWS secretAccessKey must be a non empty String');

        this.#logger = logger.createChild({ name: 'ObjectStore' });

        this.#s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        this.#environment = environment;
        this.#s3BucketName = bucketName;

        this.#s3Endpoint = `https://${ bucketName }.s3.${ region }.amazonaws.com`;

        this.#s3Options = {
            accessKey: accessKeyId,
            secretKey: secretAccessKey,
            region,
            service: 's3',
        };
    }

    /**
     * @public
     */
    async put(obj) {
        const key = this.#generateRemoteObjectKey(obj);
        const { id, contentType, contentLength, sha256Hash } = obj;
        const etag = obj.getEtag();
        const storageClass = S3_STORAGE_CLASS_MAPPING[obj.storageClass];

        this.#logger.log('put object; uploading', { key, id });

        assert(
            isNonEmptyString(id),
            'RemoteObject.id must be a non empty string'
        );
        assert(
            isNonEmptyString(contentType),
            'RemoteObject.contentType must be a non empty string'
        );
        assert(
            isNumberNotNaN(contentLength),
            'RemoteObject.contentLength must be a number'
        );
        assert(
            isNonEmptyString(sha256Hash),
            'RemoteObject.sha256Hash must be a non empty string'
        );
        assert(
            isNonEmptyString(storageClass),
            'RemoteObject.storageClass must map to S3 storage class'
        );

        // Buffering the file fixes the corrupted AWS upload caused by the AWS JavaScript SDK, but
        // is probably not a good solution.
        // const buff = await fsp.readFile(obj.filepath);

        const result = await this.awsPutObjectCommand({
            key,
            readStream: obj.createReadStream(),
            contentType,
            contentLength,
            id,
            storageClass,
            sha256Hash,
        });

        this.#logger.debug('put object; uploaded', { key, id });

        if (etag !== result.etag) {
            this.#logger.error('local md5 hash does not match s3', { etag, s3Etag: result.etag });
            throw new OperationalError('Local MD5 hash does not match S3');
        }

        return obj.updateFromS3(result);
    }

    /**
     * @public
     */
    async fetchHead(obj) {
        const bucket = this.#s3BucketName;
        const key = this.#generateRemoteObjectKey(obj);

        this.#logger.log('fetch object head', { bucket, key });

        let result;
        try {
            result = await this.awsHeadObjectCommand(key);
        } catch (error) {
            if (error.code === 403) {
                this.#logger.debug('fetch object head; not found', { bucket, key });
                return null;
            }
            throw error;
        }

        return obj.updateFromS3(result);
    }

    async fetchObject(obj) {
        const bucket = this.#s3BucketName;
        const key = this.#generateRemoteObjectKey(obj);

        this.#logger.log('fetch object', { bucket, key });

        const options = {
            Bucket: bucket,
            Key: key,
        };

        if (obj.version) {
            options.VersionId = obj.version;
        }

        let result;
        try {
            result = await this.awsGetObjectCommand(options);
        } catch (error) {
            if (error.name === '403' || error.name === 'AccessDenied') {
                this.#logger.debug('fetch object; not found', { bucket, key });
                return null;
            }
            throw error;
        }

        const newObject = obj.updateFromS3(result);

        return [ newObject, result.Body ];
    }

    /**
     * @private
     */
    awsGetObjectCommand(options) {
        const command = new GetObjectCommand(options);
        return this.#s3Client.send(command);
    }

    /**
     * @private
     */
    awsPutObjectCommand(options) {
        const {
            key,
            readStream,
            contentType,
            contentLength,
            storageClass,
            id,
            sha256Hash,
        } = options;

        return new Promise((resolve, reject) => {
            const method = 'PUT';
            const url = new URL(key, this.#s3Endpoint);

            const requestSignatureOptions = {
                method,
                url,
                contentType,
                awsHeaders: {
                    'x-amz-storage-class': storageClass,
                    'x-amz-meta-id': id,
                },
            };

            const headers = SignAWSRequest.signRequest(
                this.#s3Options,
                requestSignatureOptions,
                sha256Hash
            );

            headers.set('content-length', contentLength);

            const requestOptions = {
                method,
                headers: SignAWSRequest.headersToPlainObject(headers),
            };

            const req = https.request(url, requestOptions, (res) => {
                const chunks = [];

                res.on('error', reject);

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', (chunk) => {
                    if (chunk) {
                        chunks.push(chunk);
                    }

                    const { statusCode } = res;

                    if (statusCode !== 200) {
                        // TODO: Interpret AWS S3 response with XML parser.
                        const utf8 = Buffer.concat(chunks).toString('utf8');
                        this.#logger.warn('unexpected s3 response', { statusCode, utf8 });
                        const error = new Error('unexpected s3 response');
                        error.code = statusCode;
                        reject(error);
                    } else {
                        resolve({
                            version: res.headers['x-amz-version-id'],
                            // Remove the double quotes if they exist.
                            etag: (res.headers.etag || '').replace(/^"|"$/g, ''),
                            storageClass: res.headers['x-amz-storage-class'],
                            id,
                            contentType,
                            contentLength,
                            lastModifiedDate: new Date(),
                        });
                    }
                });
            });

            req.on('error', (error) => {
                if (error.code === 'EPIPE') {
                    // The EPIPE error is emitted if the remote end of the connection is closed before
                    // we finish streaming the object.
                    // eslint-disable-next-line no-console
                    this.#logger.warn('remote connection closed', { key, id });
                } else {
                    reject(error);
                }
            });

            readStream.pipe(req);
        });
    }

    /**
     * @private
     */
    awsHeadObjectCommand(key) {

        return new Promise((resolve, reject) => {
            const method = 'HEAD';
            const url = new URL(key, this.#s3Endpoint);

            const requestSignatureOptions = {
                method,
                url,
            };

            const headers = SignAWSRequest.signRequest(
                this.#s3Options,
                requestSignatureOptions,
                // SHA256 hash of an empty buffer
                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
            );

            const requestOptions = {
                method,
                headers: SignAWSRequest.headersToPlainObject(headers),
            };

            const req = https.request(url, requestOptions, (res) => {
                const chunks = [];

                res.on('error', reject);

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', (chunk) => {
                    if (chunk) {
                        chunks.push(chunk);
                    }

                    const { statusCode } = res;

                    if (statusCode !== 200) {
                        // TODO: Interpret AWS S3 response with XML parser.
                        const utf8 = Buffer.concat(chunks).toString('utf8');
                        this.#logger.warn('unexpected s3 response', { statusCode, utf8 });
                        const error = new Error('unexpected s3 response');
                        error.code = statusCode;
                        reject(error);
                    } else {
                        const lastModifiedDate = res.headers['last-modified']
                            ? new Date(res.headers['last-modified'])
                            : null;

                        resolve({
                            version: res.headers['x-amz-version-id'],
                            // Remove the double quotes if they exist.
                            etag: (res.headers.etag || '').replace(/^"|"$/g, ''),
                            storageClass: res.headers['x-amz-storage-class'],
                            id: res.headers['x-amz-meta-id'],
                            contentType: res.headers['content-type'],
                            contentLength: parseInt(res.headers['content-length'], 10),
                            lastModifiedDate,
                        });
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }

    /**
     * @private
     */
    #generateRemoteObjectKey(obj) {
        const { key, scopeId } = obj;

        const parts = key.split('/');

        for (const part of parts) {
            // Just perform an assertion here. Validation should be done on the
            // RemoteObject instance (obj).
            assert(ALLOWED_KEY_PATH_RX.test(part), `: "${ part }"`);
            assertFalsy(part.startsWith('.'), `: "${ part }"`);
            assertFalsy(part.endsWith('.'), `: "${ part }"`);
        }

        return `${ this.#environment }/${ scopeId }/${ parts.join('/') }`;
    }
}
