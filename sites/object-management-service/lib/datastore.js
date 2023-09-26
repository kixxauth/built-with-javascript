import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { OperationalError, JSONParsingError } from './errors.js';
import { KixxAssert } from '../dependencies.js';


const { isNonEmptyString, assert, assertIncludes } = KixxAssert;


const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];


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

    async fetch(type, id) {
        const itemKey = this.#createItemKey(type, id);
        const doc = await this.#fetchDocument();
        // Return null instead of undefined if the object does not exist.
        return doc[itemKey] || null;
    }

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

    #createItemKey(type, id) {
        return `${ type }:${ id }`;
    }
}
