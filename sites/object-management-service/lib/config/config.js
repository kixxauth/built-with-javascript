import fsp from 'node:fs/promises';
import toml from '@iarna/toml';

export default class Config {

    #rootConfigDir = null;

    constructor({ rootConfigDir }) {
        this.#rootConfigDir = rootConfigDir;

        this.logger = null;
        this.server = null;
        this.dataStore = null;
    }

    async load(environment) {
        const fileName = `${ environment }.toml`;
        const config = await this.#loadFile(fileName);

        Object.defineProperties(this, {
            logger: {
                enumerable: true,
                value: new LoggerConfig(config.logger),
            },
            server: {
                enumerable: true,
                value: new ServerConfig(config.server),
            },
            dataStore: {
                enumerable: true,
                value: new DataStoreConfig(config.dataStore),
            },
        });
    }

    async #loadFile(fileName) {
        const url = new URL(fileName, this.#rootConfigDir);
        const utf8 = await fsp.readFile(url, { encoding: 'utf8' });
        return toml.parse(utf8);
    }
}

class LoggerConfig {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    getLevel() {
        return this.#config.level || 'trace';
    }

    getMakePretty() {
        return this.#config.makePretty || false;
    }
}

class ServerConfig {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    getPort() {
        return this.#config.port || 3003;
    }
}

class DataStoreConfig {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    getRegion() {
        return this.#config.region;
    }

    getBucketName() {
        return this.#config.bucketName;
    }

    getEnvironment() {
        return this.#config.environment;
    }

    getAccessKeyId() {
        return this.#config.accessKeyId;
    }

    getSecretAccessKey() {
        return this.#config.secretAccessKey;
    }
}
