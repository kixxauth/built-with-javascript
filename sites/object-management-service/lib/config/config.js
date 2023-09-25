import fsp from 'node:fs/promises';
import toml from '@iarna/toml';

export default class Config {

    #logger = null;
    #server = null;
    #rootConfigDir = null;

    constructor({ rootConfigDir }) {
        this.#rootConfigDir = rootConfigDir;
    }

    async load(environment) {
        const fileName = `${ environment }.toml`;
        const config = await this.#loadFile(fileName);

        this.#logger = new LoggerConfig(config.logger);
        this.#server = new ServerConfig(config.server);
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
