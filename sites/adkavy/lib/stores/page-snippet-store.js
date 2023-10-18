import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import marked from 'marked';


marked.use({
    headerIds: false,
    mangle: false,
});


export default class PageSnippetStore {

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

    async fetchBatch(ids) {
        const promises = ids.map(this.fetchSnippet.bind(this));
        const list = await Promise.all(promises);

        // Convert results from Array to plain Object.
        const results = {};
        return ids.reduce((res, id, index) => {
            results[id] = list[index];
            return results;
        }, results);
    }

    async fetchSnippet(id) {
        const filepath = path.join(this.#directory, `${ id }.md`);
        const utf8 = await fsp.readFile(filepath, { encoding: 'utf8' });
        return marked.parse(utf8);
    }

    #onFileChange(eventType, fileName) {
        const pageId = path.basename(fileName, '.toml');
        this.#eventBus.emit(`PageDataStore:update:${ pageId }`, { pageId });
    }
}
