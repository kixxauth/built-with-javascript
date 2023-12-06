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

    const data = {
        foo: 'bar',
        bar: 'baz',
        baz: [ 'foo', 'bar' ],
    };

    const options = {
        s3Bucket: config.s3Bucket,
        s3StorageClass: 'STANDARD_IA',
        contentType: 'application/json',
    };

    const res = await client.putObject(
        options,
        `/development/test/${ Date.now() }.json`,
        Buffer.from(JSON.stringify(data, null, 4))
    );

    try {
        assert(res);
        assertEqual('60955694d380deba88329f1d7ea4a495', res.etag);
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
