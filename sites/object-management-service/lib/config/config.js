import os from 'node:os';
import path from 'node:path';
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

    /**
     * @public
     */
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
            application: {
                enumerable: true,
                value: new ApplicationConfig(config.application),
            },
            dataStore: {
                enumerable: true,
                value: new DataStoreConfig(config.dataStore),
            },
            objectStore: {
                enumerable: true,
                value: new ObjectStoreConfig(config.objectStore),
            },
            mediaConvert: {
                enumerable: true,
                value: new MediaConvertConfig(config.mediaConvert),
            },
            localObjectStore: {
                enumerable: true,
                value: new LocalObjectStoreConfig(config.localObjectStore),
            },
        });
    }

    /**
     * @private
     */
    async #loadFile(fileName) {
        const url = new URL(fileName, this.#rootConfigDir);
        const utf8 = await fsp.readFile(url, { encoding: 'utf8' });
        return toml.parse(utf8);
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

class ApplicationConfig {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    getEnvironment() {
        return this.#config.environment;
    }

    getImgixBaseURL() {
        return this.#config.imgixBaseURL || 'http://www.example.com';
    }
}

class ObjectStoreConfig {
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

class MediaConvertConfig {
    #config = null;

    constructor(config = {}) {
        this.#config = config;
    }

    getAccessKeyId() {
        return this.#config.accessKeyId;
    }

    getSecretAccessKey() {
        return this.#config.secretAccessKey;
    }

    getEndpoint() {
        return this.#config.endpoint;
    }

    getRole() {
        return this.#config.role;
    }
}

class LocalObjectStoreConfig {
    #config = null;

    constructor(config = {}) {
        this.#config = config;
    }

    getDirectory() {
        return this.#config.directory || this.#getDefaultDirectory();
    }

    /**
     * @private
     */
    #getDefaultDirectory() {
        return path.join(
            os.tmpdir(),
            'kc',
            'object-management-service',
            'tmp-object-storage'
        );
    }
}
