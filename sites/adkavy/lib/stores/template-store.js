import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import vm from 'node:vm';
import Handlebars from 'handlebars';


export default class TemplateStore {

    #directory = null;
    #logger = null;
    #eventBus = null;

    constructor({ config, logger, eventBus }) {
        this.#directory = config.templateStore.getDirectory();
        this.#logger = logger.createChild({ name: 'TemplateStore' });
        this.#eventBus = eventBus;
    }

    initialize() {
        const onFileChange = this.#onFileChange.bind(this);
        const options = { persistant: false };
        fs.watch(path.join(this.#directory, 'pages'), options, onFileChange);
        fs.watch(path.join(this.#directory, 'partials'), options, onFileChange);
        fs.watch(path.join(this.#directory, 'helpers'), options, onFileChange);
    }

    async fetch(templateId) {
        const handlebars = Handlebars.create();

        await this.#registerPartialTemplates(handlebars);
        await this.#registerTemplateHelpers(handlebars);

        const filename = templateId.split('/').join('__');
        const filepath = path.join(this.#directory, 'pages', filename);
        const utf8 = await fsp.readFile(filepath, { encoding: 'utf8' });

        this.#logger.debug('compiling template', { templateId, filename });

        return handlebars.compile(utf8);
    }

    #onFileChange(eventType, filename) {
        this.#logger.debug('emitting change for', { filename });
        this.#eventBus.emit('TemplateStore:update', {});
    }

    async #safelyReadDirectory(dirname) {
        let entries;

        try {
            entries = await fsp.readdir(dirname);
        } catch (cause) {
            if (cause.code === 'ENOENT') {
                return [];
            }

            throw cause;
        }

        return entries.map((entry) => path.join(dirname, entry));
    }

    async #registerPartialTemplates(handlebars) {
        const filepaths = await this.#safelyReadDirectory(path.join(this.#directory, 'partials'));

        const promises = filepaths.map((filepath) => {
            return this.#registerPartial(handlebars, filepath);
        });

        return Promise.all(promises);
    }

    async #registerPartial(handlebars, filepath) {
        const parts = filepath.split('.');
        parts.pop(); // Pop off the file extension.
        const name = parts.join('.');

        const html = await fsp.readFile(filepath, { encoding: 'utf8' });

        handlebars.registerPartial(name, html);
        return true;
    }

    async #registerTemplateHelpers(handlebars) {
        const filepaths = await this.#safelyReadDirectory(path.join(this.#directory, 'helpers'));

        const promises = filepaths.map((filepath) => {
            return this.#registerHelper(handlebars, filepath);
        });

        return Promise.all(promises);
    }

    async #registerHelper(handlebars, filepath) {
        const sourceCode = await fsp.readFile(filepath, { encoding: 'utf8' });
        const context = { exports: { name: null, helper: null }, Handlebars };

        vm.runInNewContext(sourceCode, context, { timeout: 100 });

        const { name, helper } = context.exports;

        handlebars.registerHelper(name, helper);
        return true;
    }
}
