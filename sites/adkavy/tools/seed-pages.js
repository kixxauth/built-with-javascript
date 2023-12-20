import util from 'node:util';
import path from 'node:path';
import fsp from 'node:fs/promises';
import { createLogger } from '../lib/logger.js';
import Config from '../lib/config/mod.js';
import AwsDynamoDbClient from '../lib/aws-dynamodb-client/mod.js';
import DataStore from '../lib/stores/data-store.js';
import Page from '../lib/models/page.js';
import { fromFileUrl } from '../lib/utils.js';


const ROOT_DIR = fromFileUrl(new URL('../', import.meta.url));


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

    const config = new Config({
        rootConfigDir: path.join(ROOT_DIR, 'config'),
    });

    await config.load(environment);

    const logger = createLogger({
        name: 'SeedPages',
        level: 'debug',
        makePretty: true,
    });

    logger.log('start seeding pages', { environment });

    const dynamoDbClient = AwsDynamoDbClient.fromConfig(logger, config);
    const dataStore = new DataStore({ config, logger, dynamoDbClient });

    const filedir = path.join(ROOT_DIR, 'seeds', 'pages');

    const entries = await fsp.readdir(filedir);

    for (const filename of entries) {
        const filepath = path.join(filedir, filename);
        const record = await readSeedFile(filepath);
        const page = new Page(record);

        await dataStore.save(page);
    }
}

async function readSeedFile(filepath) {
    const { type, id, attributes } = await import(filepath);
    return { type, id, attributes };
}

main();
