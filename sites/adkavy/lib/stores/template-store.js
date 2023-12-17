import path from 'node:path';
import fsp from 'node:fs/promises';
import vm from 'node:vm';
import Handlebars from 'handlebars';


export default class TemplateStore {

    #directory = null;
    #logger = null;

    constructor({ directory, logger }) {
        this.#directory = directory;
        this.#logger = logger.createChild({ name: 'TemplateStore' });
    }

    async fetch(templateId) {
        const handlebars = Handlebars.create();

        await this.#registerPartialTemplates(handlebars);
        await this.#registerTemplateHelpers(handlebars);

        const filename = templateId.split('/').join('__');
        const filepath = path.join(this.#directory, 'pages', filename);

        let utf8;
        try {
            utf8 = await fsp.readFile(filepath, { encoding: 'utf8' });
        } catch (cause) {
            if (cause.code === 'ENOENT') {
                this.#logger.error('template does not exist', { templateId, filepath });
                return null;
            }
            throw new Error(`Unexpected error reading template file ${ filepath }`, { cause });
        }

        this.#logger.debug('compiling template', { templateId, filename });

        return handlebars.compile(utf8);
    }

    async #registerPartialTemplates(handlebars) {
        const filepaths = await this.#safelyReadDirectory(path.join(this.#directory, 'partials'));

        const promises = filepaths.map((filepath) => {
            return this.#registerPartial(handlebars, filepath);
        });

        return Promise.all(promises);
    }

    async #registerPartial(handlebars, filepath) {
        const parts = path.basename(filepath).split('.');
        parts.pop(); // Pop off the file extension.
        const name = parts.join('.');

        this.#logger.debug('register partial', { filepath, name });

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
        const name = path.basename(filepath, '.js');

        vm.runInNewContext(sourceCode, context, { timeout: 100 });

        const { helper } = context.exports;

        handlebars.registerHelper(name, helper);
        return true;
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
}
