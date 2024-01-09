import Kixx from '../../kixx/mod.js';
import AwsDynamoDBClient from '../aws-dynamodb-client/aws-dynamodb-client.js';
import DynamoDBEngine from '../dynamodb-engine/dynamodb-engine.js';
import TemplateStore from '../handlebars-template-engine/template-store.js';

const { DataStore, BlobStore } = Kixx.Stores;


export function createDataStore({ config, eventBus, logger }) {
    const { environment } = config.dataStore;

    const dynamoDBClient = new AwsDynamoDBClient({
        logger: logger.createChild({ name: 'AWSDynamoDBClient' }),
        awsRegion: config.dynamoDB.region,
        awsDynamoDbEndpoint: config.dynamoDB.endpoint,
        awsAccessKey: config.dynamoDB.accessKeyId,
        awsSecretKey: config.dynamoDB.secretAccessKey,
    });

    const engine = new DynamoDBEngine({
        environment,
        dynamoDBClient,
    });

    return new DataStore({
        logger: logger.createChild({ name: 'DataStore' }),
        eventBus,
        engine,
    });
}

export function createBlobStore() {
    return new BlobStore();
}

export function createTemplateStore({ logger, directory }) {
    return new TemplateStore({ logger, directory });
}
