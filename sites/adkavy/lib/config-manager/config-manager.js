import path from 'node:path';
import fsp from 'node:fs/promises';
import toml from '@iarna/toml';


export default class ConfigManager {

    #rootConfigDir = null;

    constructor({ rootConfigDir }) {
        this.#rootConfigDir = rootConfigDir;
    }

    async load(environment) {
        const fileName = `${ environment }.toml`;
        const filepath = path.join(this.#rootConfigDir, fileName);
        const utf8 = await fsp.readFile(filepath, { encoding: 'utf8' });
        const config = toml.parse(utf8);
        return deepFreeze(config);
    }
}

function deepFreeze(obj) {
    for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object') {
            deepFreeze(obj[key]);
        }
    }

    return Object.freeze(obj);
}
