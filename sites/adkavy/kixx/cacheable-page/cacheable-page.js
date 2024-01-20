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
import RootPage from './root-page.js';

const { NotFoundError } = Errors;

const { assert, isNonEmptyString } = KixxAssert;


export default class CacheablePage {

    #cachedPageData = null;
    #cachedTemplate = null;
    #cachedContentSnippets = null;
    #cachedMarkup = new Map();

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
            notCacheable,
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
            // Is the page markup cacheable?
            cacheable: {
                value: !notCacheable,
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
        let page;

        try {
            page = await this.getPageData();
        } catch (error) {
            // Catch, report, and rethrow so that we capture unexpected HTTP errors
            // like NotFoundError
            this.logger.warn('error in getPageData()', { error });
            throw error;
        }

        try {
            if (Array.isArray(page.snippets) && page.snippets.length > 0) {
                // The snippets Array is converted to an Object here.
                page.snippets = await this.getContentSnippets(page.snippets);
            } else {
                page.snippets = {};
            }
        } catch (error) {
            // Catch, report, and rethrow so that we capture unexpected HTTP errors
            // like NotFoundError
            this.logger.warn('error in getContentSnippets()', { error });
            throw error;
        }

        const data = await this.getDynamicData(args);

        return Object.assign(baseData, page, data);
    }

    /**
     * @public
     */
    async generateMarkup(key, baseData, args) {
        if (this.#cachedMarkup.has(key)) {
            return this.#cachedMarkup.get(key);
        }

        const { pageId } = this;

        this.logger.debug('refresh markup', { pageId });

        const data = await this.generateJSON(baseData, args);

        let template;
        try {
            template = await this.getTemplate();
        } catch (error) {
            // Catch, report, and rethrow so that we capture unexpected HTTP errors
            // like NotFoundError
            this.logger.warn('error in getTemplate()', { error });
            throw error;
        }

        const utf8 = template(data);

        if (this.cache && this.cacheable) {
            this.#cachedMarkup.set(key, utf8);
        }

        return utf8;
    }

    /**
     * @private
     */
    async getPageData() {
        if (this.#cachedPageData) {
            return this.#cachedPageData;
        }

        const { pageId, dataStore } = this;

        this.logger.debug('refresh page data', { pageId });

        const page = await RootPage.load(dataStore, pageId);

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

        const { pageId, blobStore } = this;

        this.logger.debug('refresh snippets', { snippetIds });

        const snippetsList = await blobStore.fetchBatch(snippetIds);

        const snippets = {};

        snippetsList.forEach((snippet, index) => {
            const id = snippetIds[index];
            if (!snippet) {
                throw new NotFoundError(`Page snippet "${ pageId }:${ id }" could not be found`);
            }

            snippets[id] = snippet;
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

        const { templateId, templateStore } = this;

        this.logger.debug('refresh template', { templateId });

        const template = await templateStore.fetch(templateId);

        if (!template) {
            throw new NotFoundError(`Template "${ templateId }" could not be found`);
        }

        if (this.cache) {
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
     * Override mapDataStoreRecordToView() for dynamic pages.
     * @private
     */
    mapDataStoreRecordToView() {
        return {};
    }

    /**
     * @private
     */
    bindEventListeners() {
        this.eventBus.on('DataStore:updateItem', this.#onPageDataStoreUpdate.bind(this));
        this.eventBus.on('BlobStore:updateItem', this.#onPageSnippetStoreUpdate.bind(this));
    }

    /**
     * @private
     */
    deleteCache() {
        const { pageId } = this;
        this.logger.info('clearing page cache', { pageId });

        this.#cachedMarkup.clear();
        this.#cachedPageData = null;
        this.#cachedContentSnippets = null;
        this.#cachedTemplate = null;
    }

    /**
     * @private
     */
    #onPageDataStoreUpdate({ id, attributes }) {
        const { pageId } = this;
        if (id === pageId) {
            this.logger.info('detected page data update', { pageId });
            this.deleteCache();
            this.#cachedPageData = structuredClone(attributes);
        }
    }

    /**
     * @private
     */
    async #onPageSnippetStoreUpdate({ id }) {
        const page = await this.getPageData();

        if (Array.isArray(page.snippets) && page.snippets.includes(id)) {
            const { pageId } = this;
            this.logger.info('detected snippet update', { pageId, snippetId: id });
            this.deleteCache();
        }
    }
}
