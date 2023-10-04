import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { KixxAssert } from '../dependencies.js';


const {
    isNonEmptyString,
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
    #environment = null;

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
    }

    async put(obj) {
        const bucket = this.#s3BucketName;
        const key = this.#generateRemoteObjectKey(obj);
        const { id, contentType } = obj;
        const storageClass = S3_STORAGE_CLASS_MAPPING[obj.storageClass];

        this.#logger.log('put object; uploading', { bucket, key, id });

        assert(
            isNonEmptyString(id),
            'RemoteObject.id must be a non empty string'
        );
        assert(
            isNonEmptyString(contentType),
            'RemoteObject.contentType must be a non empty string'
        );
        assert(
            isNonEmptyString(storageClass),
            'RemoteObject.storageClass must map to S3 storage class'
        );

        const result = await this.private_awsPutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: obj.createReadStream(),
            ContentType: contentType,
            Metadata: { id },
            StorageClass: storageClass,
        });

        this.#logger.log('put object; uploaded', { bucket, key, id });

        return obj.updateFromS3Put(result);
    }

    async fetchHead(obj) {
        const bucket = this.#s3BucketName;
        const key = this.#generateRemoteObjectKey(obj);

        this.#logger.log('fetch object head', { bucket, key });

        let result;
        try {
            result = await this.private_awsHeadObjectCommand({
                Bucket: bucket,
                Key: key,
            });
        } catch (error) {
            if (error.name === '403') {
                this.#logger.log('fetch object head; not found', { bucket, key });
                return null;
            }
            throw error;
        }

        this.#logger.log('fetch object head; found', { bucket, key });
        return obj.updateFromS3Head(result);
    }

    // Private - Use public notation for testing.
    private_awsPutObjectCommand(options) {
        const command = new PutObjectCommand(options);
        return this.#s3Client.send(command);
    }

    // Private - Use public notation for testing.
    private_awsHeadObjectCommand(options) {
        const command = new HeadObjectCommand(options);
        return this.#s3Client.send(command);
    }

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
