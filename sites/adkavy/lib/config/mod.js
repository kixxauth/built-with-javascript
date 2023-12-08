import path from 'node:path';
import fsp from 'node:fs/promises';
import toml from '@iarna/toml';


export default class Config {

    #rootConfigDir = null;

    constructor({ rootConfigDir }) {
        this.#rootConfigDir = rootConfigDir;
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
            dynamoDB: {
                enumerable: true,
                value: new DynamoDBConfig(config.dynamoDB),
            },
            objectService: {
                enumerable: true,
                value: new ObjectServiceConfig(config.objectService),
            },
        });
    }

    async #loadFile(fileName) {
        const filepath = path.join(this.#rootConfigDir, fileName);
        const utf8 = await fsp.readFile(filepath, { encoding: 'utf8' });
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

    getEnvironment() {
        return this.#config.environment || 'development';
    }
}

class DynamoDBConfig {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    getEndpoint() {
        return this.#config.endpoint;
    }

    getRegion() {
        return this.#config.region;
    }

    getAccessKeyId() {
        return this.#config.accessKeyId;
    }

    getSecretAccessKey() {
        return this.#config.secretAccessKey;
    }
}

class ObjectServiceConfig {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    getEndpoint() {
        return this.#config.endpoint;
    }

    getScope() {
        return this.#config.scope;
    }

    getToken() {
        return this.#config.token;
    }
}
