import { KixxAssert } from '../../dependencies.js';
import { OperationalError } from '../errors.js';

const {
    isPlainObject,
    isNonEmptyString,
    assert,
} = KixxAssert;


export default class BasePage {

    #pageId = null;
    #templateId = null;

    #logger = null;
    #eventBus = null;
    #pageDataStore = null;
    #pageSnippetStore = null;
    #templateStore = null;

    #isDynamic = false;
    #caching = false;

    #cachedPageData = null;
    #cachedContentSnippets = null;
    #cachedTemplate = null;
    #cachedHTML = null;

    constructor(spec) {
        assert(isPlainObject(spec), 'isPlainObject');
        assert(isNonEmptyString(spec.pageId), 'spec.pageId isNonEmptyString');
        assert(isNonEmptyString(spec.templateId), 'spec.templateId isNonEmptyString');
        assert(spec.logger);
        assert(spec.eventBus);
        assert(spec.pageDataStore);
        assert(spec.pageSnippetStore);
        assert(spec.templateStore);

        const {
            pageId,
            templateId,
            isDynamic,
            caching,
            logger,
            eventBus,
            pageDataStore,
            pageSnippetStore,
            templateStore,
        } = spec;

        this.#pageId = pageId;
        this.#templateId = templateId;
        this.#isDynamic = Boolean(isDynamic);
        this.#caching = Boolean(caching);
        this.#logger = logger.createChild({ name: 'BasePage' });
        this.#pageDataStore = pageDataStore;
        this.#pageSnippetStore = pageSnippetStore;
        this.#templateStore = templateStore;

        if (this.#caching) {
            const regenerateCache = this.rengerateCache.bind(this);
            eventBus.on(`PageDataStore:update:${ pageId }`, regenerateCache);
            eventBus.on('PageSnippetStore:update', regenerateCache);
            eventBus.on('TemplateStore:update', regenerateCache);
        }
    }

    isCacheable() {
        return this.#caching && !this.#isDynamic;
    }

    async generateJSON(params) {
        let page = await this.getPageData();
        page = page || {};

        if (Array.isArray(page.snippets) && page.snippets.length > 0) {
            page.snippets = await this.getContentSnippets(page.snippets);
        } else {
            page.snippets = {};
        }

        const data = await this.getDynamicData(params);

        return Object.assign(page, data);
    }

    async generateHTML(params) {
        if (this.#cachedHTML) {
            return this.#cachedHTML;
        }

        const page = await this.generateJSON(params);
        const template = await this.getTemplate();

        const html = template(page);

        if (this.isCacheable()) {
            this.#cachedHTML = html;
        }

        return html;
    }

    async rengerateCache() {
        const name = this.constructor.name;
        const pageId = this.#pageId;

        this.#logger.info('regenerating page cache', { name, pageId });

        try {
            this.#cachedHTML = null;
            this.#cachedPageData = null;
            this.#cachedContentSnippets = null;
            this.#cachedTemplate = null;
            await this.generateHTML();
        } catch (cause) {
            const error = new OperationalError(
                `Error regenerating page cache in ${ name }:${ pageId }`,
                { fatal: true, cause }
            );
            this.#eventBus.emit('error', error);
        }
    }

    getPageData() {
        if (this.#cachedPageData) {
            return this.#cachedPageData;
        }

        const pageData = this.#pageDataStore.fetch(this.#pageId);

        // We don't cache page data for static pages, since we cache the full HTML
        // content utf8 for static pages.
        if (this.#caching && this.#isDynamic) {
            this.#cachedPageData = pageData;
        }

        return pageData;
    }

    getContentSnippets(snippetIds) {
        if (this.#cachedContentSnippets) {
            return this.#cachedContentSnippets;
        }

        const snippets = this.#pageSnippetStore.fetchBatch(snippetIds);

        // We don't cache snippets for static pages, since we cache the full HTML
        // content utf8 for static pages.
        if (this.#caching && this.#isDynamic) {
            this.#cachedContentSnippets = snippets;
        }

        return snippets;
    }

    getTemplate() {
        if (this.#cachedTemplate) {
            return this.#cachedTemplate;
        }

        const template = this.#templateStore.fetch(this.#templateId);

        // We don't cache templates for static pages, since we cache the full HTML
        // content utf8 for static pages.
        if (this.#caching && this.#isDynamic) {
            this.#cachedTemplate = template;
        }

        return template;
    }

    getDynamicData() {
        return null;
    }
}
