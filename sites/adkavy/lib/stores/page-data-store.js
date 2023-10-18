import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import toml from '@iarna/toml';


export default class PageDataStore {

    #directory = null;
    #logger = null;
    #eventBus = null;

    constructor({ config, logger, eventBus }) {
        this.#directory = config.pageDataStore.getDirectory();
        this.#logger = logger.createChild({ name: 'PageDataStore' });
        this.#eventBus = eventBus;
    }

    initialize() {
        const onFileChange = this.#onFileChange.bind(this);
        const options = { persistant: false };
        fs.watch(this.#directory, options, onFileChange);
    }

    async fetch(pageId) {
        const filename = pageId.split('/').join('__');
        const filepath = path.join(this.#directory, `${ filename }.toml`);

        let utf8;
        try {
            utf8 = await fsp.readFile(filepath, { encoding: 'utf8' });
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }

        return toml.parse(utf8);
    }

    #onFileChange(eventType, filename) {
        filename = path.basename(filename, '.toml');
        const pageId = filename.replace(/[_]{2}/g, '/');
        this.#logger.debug('emitting change for page', { pageId });
        this.#eventBus.emit(`PageDataStore:update:${ pageId }`, { pageId });
    }
}
