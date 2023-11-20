import DynamoDBClient from '../dynamodb/dynamodb-client.js';
import { KixxAssert } from '../../dependencies.js';


const { assert, assertIncludes, isNonEmptyString } = KixxAssert;


const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];


export default class DataStore {

    #logger = null;
    #dynamoDBClient = null;

    constructor({ config, logger }) {
        const awsRegion = config.dynamoDB.getRegion();
        const awsAccessKeyId = config.dynamoDB.getAccessKeyId();
        const awsSecretKey = config.dynamoDB.getSecretAccessKey();
        const awsDynamoDbEndpoint = config.dynamoDB.getEndpoint();
        const applicationName = config.dynamoDB.getApplicationName();
        const environment = config.dynamoDB.getEnvironment();

        assert(isNonEmptyString(awsRegion), 'DynamoDB region must be a non empty String');
        assert(isNonEmptyString(awsAccessKeyId), 'DynamoDB accessKeyId must be a non empty String');
        assert(isNonEmptyString(awsSecretKey), 'DynamoDB secretAccessKey must be a non empty String');
        assert(isNonEmptyString(applicationName), 'DynamoDB applicationName must be a non empty String');

        assertIncludes(
            environment,
            ALLOWED_ENVIRONMENTS,
            `DynamoDB environment must be one of "${ ALLOWED_ENVIRONMENTS.join('","') }"`
        );

        this.#logger = logger.createChild({ name: 'DataStore' });

        this.#dynamoDBClient = new DynamoDBClient({
            logger,
            awsRegion,
            awsAccessKeyId,
            awsSecretKey,
            awsDynamoDbEndpoint,
            applicationName,
            environment,
        });
    }

    async fetch({ type, id }) {

        const result = await this.#dynamoDBClient.getItem({ type, id });

        console.log('DynamoDB GetItemCommand result ==>>', result);

        throw new Error('End fetch');
    }

    async save(obj) {
        this.#logger.log('save record', { type: obj.type, id: obj.id });
        obj = obj.updateMeta();

        await this.#dynamoDBClient.putItem({
            type: obj.type,
            id: obj.id,
            meta: obj.meta,
            attributes: obj.attributes,
            relationships: obj.relationships,
        });

        return obj;
    }
}
