import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import toml from '@iarna/toml';


export default class PageDataStore {

    #directory = null;
    #eventBus = null;

    constructor({ config, eventBus }) {
        this.#directory = config.pageDataStore.getDirectory();
        this.#eventBus = eventBus;
    }

    initialize() {
        const onFileChange = this.#onFileChange.bind(this);
        const options = { persistant: false };
        fs.watch(this.#directory, options, onFileChange);
    }

    async fetch(pageId) {
        const filepath = path.join(this.#directory, `${ pageId }.toml`);
        const utf8 = await fsp.readFile(filepath, { encoding: 'utf8' });
        return toml.parse(utf8);
    }

    #onFileChange(eventType, fileName) {
        const pageId = path.basename(fileName, '.toml');
        this.#eventBus.emit(`PageDataStore:update:${ pageId }`, { pageId });
    }
}
