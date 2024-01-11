import { EventEmitter } from 'node:events';
import util from 'node:util';
import path from 'node:path';
import fsp from 'node:fs/promises';
import Kixx from '../kixx/mod.js';
import { createLogger } from '../lib/logger.js';
import ConfigManager from '../lib/config-manager/config-manager.js';
import AwsDynamoDBClient from '../lib/aws-dynamodb-client/aws-dynamodb-client.js';
import DynamoDBEngine from '../lib/dynamodb-engine/dynamodb-engine.js';
import { fromFileUrl } from '../lib/utils.js';

const { DataStore } = Kixx.Stores;
const { RootPage } = Kixx.CacheablePage;


const ROOT_DIR = fromFileUrl(new URL('../', import.meta.url));

const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];


async function main() {
    const args = util.parseArgs({
        options: {
            environment: {
                type: 'string',
                short: 'e',
                default: 'development',
            },
        },
    });

    const { environment } = args.values;

    if (!ALLOWED_ENVIRONMENTS.includes(environment)) {
        throw new Error(`Invalid environment argument: "${ environment }"`);
    }

    const configManager = new ConfigManager({
        rootConfigDir: path.join(ROOT_DIR, 'config'),
    });

    const config = await configManager.load(environment);

    const logger = createLogger({
        name: 'SeedPages',
        level: 'debug',
        makePretty: true,
    });

    logger.log('start seeding pages', { environment });

    const eventBus = new EventEmitter();

    const dynamoDBClient = new AwsDynamoDBClient({
        logger: logger.createChild({ name: 'AWSDynamoDBClient' }),
        awsRegion: config.dynamoDB.region,
        awsDynamoDbEndpoint: config.dynamoDB.endpoint,
        awsAccessKey: config.dynamoDB.accessKeyId,
        awsSecretKey: config.dynamoDB.secretAccessKey,
    });

    const dataStore = new DataStore({
        logger: logger.createChild({ name: 'DataStore' }),
        eventBus,
        engine: new DynamoDBEngine({
            environment: config.dataStore.environment,
            dynamoDBClient,
        }),
    });

    const filedir = path.join(ROOT_DIR, 'seeds', 'pages');

    const entries = await fsp.readdir(filedir);

    for (const filename of entries) {
        const filepath = path.join(filedir, filename);
        const { id, attributes } = await readSeedFile(filepath);

        const page = await RootPage.createOrUpdate(dataStore, id, attributes);

        console.log('updated page', page.id);
    }
}

async function readSeedFile(filepath) {
    const { type, id, attributes } = await import(filepath);
    return { type, id, attributes };
}

main();
