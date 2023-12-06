/**
 * This script requires a JSON config file with shape:
 * {
 *   s3Region,
 *   s3Bucket,
 *   s3AccessKey,
 *   s3SecretKey,
 * }
 */
import path from 'node:path';
import fsp from 'node:fs/promises';
import { KixxAssert } from '../../dependencies.js';
import { createLogger } from '../../lib/logger.js';
import AwsS3Client from '../../lib/aws-s3-client/mod.js';

const { assert, assertEqual } = KixxAssert;


// Should be something like './end-to-end-tests/aws-client/config/good.json'.
if (!process.argv[2]) {
    throw new Error('Config filepath is required argument');
}

const CONFIG_FILEPATH = path.resolve(process.argv[2]);


async function main() {
    const config = await loadConfig();

    const logger = createLogger({
        name: 'Test',
        level: 'trace',
        makePretty: true,
    });

    const client = new AwsS3Client({
        logger,
        s3Region: config.s3Region,
        s3AccessKey: config.s3AccessKey,
        s3SecretKey: config.s3SecretKey,
    });

    const [ metadata, buff ] = await client.getObject(
        { s3Bucket: config.s3Bucket },
        '/development/test/observations.json'
    );

    try {
        assert(metadata);
        assert(buff);
        assertEqual('cdc07ce7469de8a98b95993d85cae861', metadata.etag);
        assertEqual('application/json', metadata.contentType);
        assert(buff instanceof Buffer);
    } catch (err) {
        printError('Test error:', err);
    }
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
