/*
Implements a page caching strategy:

- _Static Pages_ - Cache the HTML output by URL, but do not cache
                   underlying data or templates.
- _List Pages_ - Cache HTML output by URL, but do not cache
                 underlying data or templates.
- _Item Pages_ - Do NOT cache HTML output or underlying data, but
                 DO cache the page data and template.

Short Summary:

- If a page IS marked cacheable, then cache the HTML output by URL, but cache nothing else.
- If a page is NOT marked cacheable, then cache the page data and template, but nothing else.
 */

import { KixxAssert } from '../../dependencies.js';
import Errors from '../errors/mod.js';

const { NotFoundError } = Errors;

const {
    assert,
    isNonEmptyString,
    isPlainObject,
} = KixxAssert;


export default class CacheablePage {

    #cachedPageData = null;
    #cachedTemplate = null;
    #cachedContentSnippets = null;
    #cachedHTML = new Map();

    constructor(spec) {
        assert(isNonEmptyString(spec.pageId), 'spec.pageId isNonEmptyString');
        assert(isNonEmptyString(spec.templateId), 'spec.templateId isNonEmptyString');
        assert(spec.logger);
        assert(spec.eventBus);
        assert(spec.dataStore);
        assert(spec.blobStore);
        assert(spec.templateStore);

        const {
            pageId,
            templateId,
            // Is the page HTML cacheable?
            cacheable,
            // Set to true to turn off caching.
            noCache,
            logger,
            eventBus,
            dataStore,
            blobStore,
            templateStore,
        } = spec;

        Object.defineProperties(this, {
            pageId: {
                enumerable: true,
                value: pageId,
            },
            templateId: {
                value: templateId,
            },
            logger: {
                value: logger,
            },
            eventBus: {
                value: eventBus,
            },
            // Is the page HTML cacheable?
            cacheable: {
                value: Boolean(cacheable),
            },
            // Toggle all caching on/off.
            cache: {
                value: !noCache,
            },
            dataStore: {
                value: dataStore,
            },
            blobStore: {
                value: blobStore,
            },
            templateStore: {
                value: templateStore,
            },
        });

        this.bindEventListeners();
    }


    /**
     * @public
     */
    async generateJSON(baseData, args) {
        const page = await this.getPageData();

        if (Array.isArray(page.snippets) && page.snippets.length > 0) {
            // The snippets Array is converted to an Object here.
            page.snippets = await this.getContentSnippets(page.snippets);
        } else {
            page.snippets = {};
        }

        const data = await this.getDynamicData(args);

        return Object.assign(baseData, page, data);
    }

    /**
     * @public
     */
    async generateHTML(key, baseData, args) {
        if (this.#cachedHTML.has(key)) {
            return this.#cachedHTML.get(key);
        }

        const page = await this.generateJSON(baseData, args);
        const template = await this.getTemplate();

        const html = template(page);

        if (this.cache && this.cacheable) {
            this.#cachedHTML.set(key, html);
        }

        return html;
    }

    /**
     * @private
     */
    deleteCache() {
        const { pageId } = this;
        this.logger.info('deleting page cache', { pageId });

        this.#cachedHTML.clear();
        this.#cachedPageData = null;
        this.#cachedContentSnippets = null;
        this.#cachedTemplate = null;
    }

    /**
     * @private
     */
    async getPageData() {
        if (this.#cachedPageData) {
            return this.#cachedPageData;
        }

        const { pageId } = this;

        const page = await this.dataStore.fetch({
            type: 'page',
            id: pageId,
        });

        if (!page) {
            throw new NotFoundError(`Page "${ pageId }" could not be found`);
        }

        const pageData = structuredClone(page.attributes);

        // If the page is cacheable, then we cache the full HTML content utf8 so there is
        // no need to cache this data.
        if (this.cache && !this.cacheable) {
            this.#cachedPageData = pageData;
        }

        return pageData;
    }

    /**
     * @private
     */
    async getContentSnippets(snippetIds) {
        if (this.#cachedContentSnippets) {
            return this.#cachedContentSnippets;
        }

        const snippetsList = await this.blobStore.fetchBatch(snippetIds);

        const snippets = {};

        snippetsList.forEach((snippet, index) => {
            if (!snippet) {
                throw new NotFoundError(`Page snippet "${ this.pageId }:${ snippetIds[index] }" could not be found`);
            }

            snippets[snippet.id] = snippet.content;
        });

        // If the page is cacheable, then we cache the full HTML content utf8 so there is
        // no need to cache this data.
        if (this.cache && !this.cacheable) {
            this.#cachedContentSnippets = snippets;
        }

        return snippets;
    }

    /**
     * @private
     */
    async getTemplate() {
        if (this.#cachedTemplate) {
            return this.#cachedTemplate;
        }

        const { templateId } = this;

        const template = await this.templateStore.fetch(templateId);

        if (!template) {
            throw new NotFoundError(`Template "${ templateId }" could not be found`);
        }

        // If the page is cacheable, then we cache the full HTML content utf8 so there is
        // no need to cache this data.
        if (this.cache && !this.cacheable) {
            this.#cachedTemplate = template;
        }

        return template;
    }

    /**
     * Override getDynamicData() for dynamic pages.
     * @private
     */
    getDynamicData() {
        return {};
    }

    /**
     * @private
     */
    bindEventListeners() {
        // TODO: Implement data store events and test them out for caching
        this.eventBus.on('DataStore:updateItem', this.#onPageDataStoreUpdate.bind(this));
        this.eventBus.on('BlobStore:updateItem', this.#onPageSnippetStoreUpdate.bind(this));
    }

    /**
     * @private
     */
    #onPageDataStoreUpdate({ id }) {
        const { pageId } = this;
        if (id === pageId) {
            this.logger.log('detected page data update', { pageId });
            this.deleteCache();
        }
    }

    /**
     * @private
     */
    #onPageSnippetStoreUpdate({ id }) {
        const page = this.getPageData();

        let snippetIds = [];

        if (isPlainObject(page.snippets)) {
            snippetIds = Object.keys(page.snippets).map((key) => {
                return page.snippets[key];
            });
        }

        if (snippetIds.includes(id)) {
            const { pageId } = this;
            this.logger.log('detected snippet update', { pageId, snippetId: id });
            this.deleteCache();
        }
    }
}
