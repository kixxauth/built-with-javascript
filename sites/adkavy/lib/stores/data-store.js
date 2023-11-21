import { KixxAssert } from '../../dependencies.js';
import DynamoDBClient from '../dynamodb/dynamodb-client.js';
import Observation from '../models/observation.js';


const { assert, assertIncludes, isNonEmptyString } = KixxAssert;


const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];

const MODELS_BY_TYPE = new Map([
    [ 'observation', Observation ],
]);


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
        this.#logger.log('fetch record', { type, id });

        const Model = MODELS_BY_TYPE.get(type);
        const spec = await this.#dynamoDBClient.getItem({ type, id });

        if (spec) {
            return new Model(spec);
        }

        return null;
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
