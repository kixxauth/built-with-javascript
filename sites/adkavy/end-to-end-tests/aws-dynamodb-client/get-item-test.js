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
    const item = await client.getItem(table, { id: 'foo-bar-baz', type: 'Foo' });

    // Uncomment for debugging.
    // console.log(JSON.stringify(item, null, 4));

    assert(item);
    assertEqual('foo-bar-baz', item.id);
    assertEqual('Foo', item.type);

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
