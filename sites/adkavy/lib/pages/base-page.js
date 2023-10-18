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

    #eventBus = null;
    #pageDataStore = null;
    #pageSnippetStore = null;
    #templateStore = null;

    #isDynamic = false;
    #caching = false;

    #cachedPageData = null;
    #cachedContentSnippets = {};
    #cachedTemplate = null;
    #cachedHTML = null;

    constructor(spec) {
        assert(isPlainObject(spec));
        assert(isNonEmptyString(spec.pageId));
        assert(isNonEmptyString(spec.templateId));
        assert(spec.eventBus);
        assert(spec.pageDataStore);
        assert(spec.pageSnippetStore);
        assert(spec.templateStore);

        const {
            pageId,
            templateId,
            isDynamic,
            caching,
            eventBus,
            pageDataStore,
            pageSnippetStore,
            templateStore,
        } = spec;

        this.#pageId = Boolean(pageId);
        this.#templateId = Boolean(templateId);
        this.#isDynamic = Boolean(isDynamic);
        this.#caching = Boolean(caching);
        this.#pageDataStore = pageDataStore;
        this.#pageSnippetStore = pageSnippetStore;
        this.#templateStore = templateStore;

        if (this.#caching) {
            const regenerateCache = this.rengerateCache.bind(this);
            eventBus.on(`PageDataStore:update:${ pageId }`, regenerateCache);
            eventBus.on(`TemplateStore:update:${ templateId }`, regenerateCache);
        }
    }

    isCacheable() {
        return this.#caching && !this.#isDynamic;
    }

    async generateHTML(params) {
        if (this.#cachedHTML) {
            return this.#cachedHTML;
        }

        const page = await this.getPageData();
        page.snippets = await this.getContentSnippets(page.snippets);
        page.data = await this.getDynamicData(params);
        const template = await this.getTemplate();

        const html = template(page);

        if (this.isCacheable()) {
            this.#cachedHTML = html;
        }

        return html;
    }

    async rengerateCache() {
        try {
            this.#cachedHTML = null;
            this.#cachedPageData = null;
            this.#cachedTemplate = null;
            this.#cachedContentSnippets = {};
            await this.generateHTML();
        } catch (cause) {
            const error = new OperationalError(
                `Error regenerating page cache in ${ this.constructor.name }:${ this.#pageId }`,
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

        const snippets = this.#pageSnippetStore.fetch(snippetIds);

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

        if (this.#caching) {
            this.#cachedTemplate = template;
        }

        return template;
    }

    getDynamicData() {
        return null;
    }
}
