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
import AwsDynamoDbClient from '../../lib/aws-dynamodb-client/aws-dynamodb-client.js';

const { assert, assertEqual } = KixxAssert;


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
        awsRegion: config.awsRegion,
        awsDynamoDbEndpoint: config.dynamodbEndpoint,
        awsAccessKey: config.awsAccessKey,
        awsSecretKey: config.awsSecretKey,
    });

    const table = `adkavy_${ ENVIRONMENT }_entities`;

    const keys = [
        // Exists:
        { type: 'observation', id: 'e8a4be6e-92dc-45ec-86ea-96b988ae9cc5' },
        // Exists:
        { type: 'page', id: 'incident-reports__2022-02-12-angel-slides' },
        // Not Found:
        { type: 'observation', id: 'a333a4f0-acce-4b15-ac6c-10bb9d61b40e' },
        // Exists:
        { type: 'observation', id: '9333a4f0-acce-4bd5-ac6c-00bb9d61b40e' },
    ];

    const items = await client.batchGetItem(table, keys);

    // Uncomment for debugging.
    // console.log(JSON.stringify(items, null, 4));

    assert(Array.isArray(items));
    // The Not Found item is not included in the results list.
    assertEqual(3, items.length);
    assertEqual('Wet Slab Activity on Cooper Kiln Slide', items[0].attributes.title);
    assertEqual('Pit at 4400 feet after new snow', items[2].attributes.title);

    // eslint-disable-next-line no-console
    console.log('Test Done');
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
