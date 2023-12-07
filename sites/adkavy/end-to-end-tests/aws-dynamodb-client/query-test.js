/**
 * This script requires a JSON config file with shape:
 * {
 *   awsRegion,
 *   awsAccessKey,
 *   awsSecretKey,
 * }
 */
import path from 'node:path';
import fsp from 'node:fs/promises';
import { KixxAssert } from '../../dependencies.js';
import { createLogger } from '../../lib/logger.js';
import AwsDynamoDbClient from '../../lib/aws-dynamodb-client/mod.js';

const { assert } = KixxAssert;


// Should be something like './end-to-end-tests/aws-dynamodb/config/good.json'.
if (!process.argv[2]) {
    throw new Error('Config filepath is required argument');
}

const CONFIG_FILEPATH = path.resolve(process.argv[2]);
const ENVIRONMENT = 'development';


async function main() {
    const config = await loadConfig();

    const logger = createLogger({
        name: 'Test',
        level: 'trace',
        makePretty: true,
    });

    const client = new AwsDynamoDbClient({
        logger,
        environment: ENVIRONMENT,
        awsRegion: config.awsRegion,
        awsDynamoDbEndpoint: config.dynamodbEndpoint,
        awsAccessKey: config.awsAccessKey,
        awsSecretKey: config.awsSecretKey,
    });

    const items = await client.query({
        type: 'Foo',
        queryName: 'observations_by_datetime',
        exclusiveStartKey: { id: 'foo-bar-baz' },
        limit: 10,
    });

    assert(Array.isArray(items));
}

async function loadConfig() {
    const utf8 = await fsp.readFile(CONFIG_FILEPATH, { encoding: 'utf8' });
    return JSON.parse(utf8);
}

function printError(message, error) {
    /* eslint-disable no-console */
    console.error(message);
    console.error(error);
    process.exit(1);
    /* eslint-enable no-console */
}

main().catch((error) => {
    printError('uncaught error', error);
});
