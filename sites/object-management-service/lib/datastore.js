import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { OperationalError, JSONParsingError } from './errors.js';
import User from './models/user.js';
import Scope from './models/scope.js';
import { KixxAssert } from '../dependencies.js';


const { isNonEmptyString, assert, assertIncludes } = KixxAssert;


const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];

const Models = [
    User,
    Scope,
];

const ModelsByType = new Map();

for (const Model of Models) {
    ModelsByType.set(Model.type, Model);
}

export default class DataStore {

    #s3Client = null;
    #s3BucketName = null;
    #dataStoreDocumentKey = null;

    constructor({ config }) {
        const region = config.dataStore.getRegion();
        const bucketName = config.dataStore.getBucketName();
        const environment = config.dataStore.getEnvironment();
        const accessKeyId = config.dataStore.getAccessKeyId();
        const secretAccessKey = config.dataStore.getSecretAccessKey();

        assert(isNonEmptyString(region), 'AWS region must be a non empty String');
        assert(isNonEmptyString(bucketName), 'AWS bucketName must be a non empty String');
        assertIncludes(
            environment,
            ALLOWED_ENVIRONMENTS,
            `DataStore environment must be one of "${ ALLOWED_ENVIRONMENTS.join('","') }"`
        );
        assert(isNonEmptyString(accessKeyId), 'AWS accessKeyId must be a non empty String');
        assert(isNonEmptyString(secretAccessKey), 'AWS secretAccessKey must be a non empty String');

        this.#s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        this.#dataStoreDocumentKey = `${ environment }/main_document.json`;
        this.#s3BucketName = bucketName;
    }

    /**
     * @public
     */
    async fetch({ type, id }) {
        const itemKey = this.#createItemKey(type, id);
        const doc = await this.#fetchDocument();

        if (doc[itemKey]) {
            const Model = this.#getModel(type);
            return new Model(doc[itemKey]);
        }

        // Return null instead of undefined if the object does not exist.
        return null;
    }

    /**
     * @public
     */
    async fetchBatch(specs) {
        const doc = await this.#fetchDocument();

        return specs.map(({ type, id }) => {
            const itemKey = this.#createItemKey(type, id);

            if (doc[itemKey]) {
                const Model = this.#getModel(type);
                return new Model(doc[itemKey]);
            }

            // Return null instead of undefined if the object does not exist.
            return null;
        });
    }

    /**
     * @public
     */
    async write(record) {
        const itemKey = this.#createItemKey(record.type, record.id);
        await this.#updateDocument(itemKey, record);
    }

    /**
     * @private
     */
    async #fetchDocument() {
        let response;
        try {
            const command = new GetObjectCommand({
                Bucket: this.#s3BucketName,
                Key: this.#dataStoreDocumentKey,
            });

            response = await this.#s3Client.send(command);
        } catch (cause) {
            throw new OperationalError(
                `Error fetching document object from S3 storage: ${ cause.message }`,
                { code: 'AWS_S3_ERR_GETOBJECT', cause, fatal: true }
            );
        }

        return this.#bufferAwsResponseJSON(response.Body);
    }

    /**
     * @private
     */
    async #updateDocument(key, record) {
        const doc = await this.#fetchDocument();

        doc[key] = record;

        try {
            const command = new PutObjectCommand({
                Bucket: this.#s3BucketName,
                Key: this.#dataStoreDocumentKey,
                StorageClass: 'STANDARD',
                ContentType: 'application/json',
                Body: JSON.stringify(doc, null, 4),
            });

            await this.#s3Client.send(command);
        } catch (cause) {
            throw new OperationalError(
                `Error writing document object to S3 storage: ${ cause.message }`,
                { code: 'AWS_S3_ERR_PUTOBJECT', cause, fatal: true }
            );
        }
    }

    /**
     * @private
     */
    #bufferAwsResponseJSON(body) {
        return new Promise((resolve, reject) => {
            const chunks = [];

            body.once('error', reject);

            body.on('data', (chunk) => {
                chunks.push(chunk);
            });

            body.once('end', () => {
                body.off('error', reject);

                const utf8 = Buffer.concat(chunks).toString('utf8');

                let error;
                let json;

                try {
                    json = JSON.parse(utf8);
                } catch (cause) {
                    error = new JSONParsingError(
                        `Error parsing S3 document: ${ cause.message }`,
                        { cause, fatal: true }
                    );
                }

                if (error) {
                    reject(error);
                } else {
                    resolve(json);
                }
            });
        });
    }

    /**
     * @private
     */
    #getModel(type) {
        if (ModelsByType.has(type)) {
            return ModelsByType.get(type);
        }

        throw new Error(`Model "${ type }" has not been registered`);
    }

    /**
     * @private
     */
    #createItemKey(type, id) {
        return `${ type }:${ id }`;
    }
}
