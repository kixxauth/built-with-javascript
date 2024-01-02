import Kixx from '../../kixx/mod.js';
import AwsDynamoDBClient from '../aws-dynamodb-client/aws-dynamodb-client.js';
import DynamoDBEngine from './dynamodb-engine.js';
import TemplateStore from './template-store.js';

const { DataStore, BlobStore } = Kixx.Stores;


export function createDataStore(options) {

    const {
        config,
        eventBus,
        logger,
    } = options;

    const dynamoDBClient = new AwsDynamoDBClient({
        logger: logger.createChild({ name: 'AwsDynamoDBClient' }),
        awsRegion: config.dynamoDB.region,
        awsDynamoDbEndpoint: config.dynamoDB.endpoint,
        awsAccessKey: config.dynamoDB.accessKeyId,
        awsSecretKey: config.dynamoDB.secretAccessKey,
    });

    const engine = new DynamoDBEngine({
        environment: config.dataStore.environment,
        dynamoDBClient,
    });

    return new DataStore({
        logger,
        eventBus,
        engine,
    });
}

export function createTemplateStore({ directory, logger }) {
    return new TemplateStore({
        directory,
        logger,
    });
}

export function createBlobStore() {
    return new BlobStore();
}
