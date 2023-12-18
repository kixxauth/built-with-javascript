/*
Implements a page caching strategy:

- _Static Pages_ - Cache the HTML output by URL, but do not cache
                   underlying data or templates.
- _List Pages_ - (ie the observations/ page) Cache HTML output by URL, but do not cache
                 underlying data or templates.
- _Item Pages_ - (ie observation detail page) Do NOT cache HTML output or underlying data, but
                 DO cache the page data and template.

Short Summary:

- If a page IS marked cacheable, then cache the HTML output by URL, but cache nothing else.
- If a page is NOT marked cacheable, then cache the page data and template, but nothing else.
 */

import { KixxAssert } from '../../dependencies.js';
import { NotFoundError } from '../errors.js';

const {
    isNonEmptyString,
    assert,
} = KixxAssert;


export default class BasePage {

    pageId = null;
    #templateId = null;

    logger = null;
    eventBus = null;

    #dataStore = null;
    #blobStore = null;
    #templateStore = null;

    #cacheable = false;
    #cache = true;

    #cachedPageData = null;
    #cachedContentSnippets = null;
    #watchedSnippetIds = [];
    #cachedTemplate = null;
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

        const name = this.constructor.name;

        Object.defineProperties(this, {
            pageId: {
                enumerable: true,
                value: pageId,
            },
            logger: {
                value: logger.createChild({ name }),
            },
            eventBus: {
                value: eventBus,
            },
        });

        this.#templateId = templateId;

        this.#cacheable = Boolean(cacheable);
        this.#cache = !noCache;

        this.#dataStore = dataStore;
        this.#blobStore = blobStore;
        this.#templateStore = templateStore;
    }

    /**
     * @public
     */
    async initialize() {
        this.#bindEventListeners();

        const page = await this.getPageData();

        if (page) {
            this.#watchedSnippetIds = page.snippets || [];
        }

        return this;
    }


    /**
     * @public
     */
    async generateJSON(request) {
        const page = await this.getPageData();

        if (Array.isArray(page.snippets) && page.snippets.length > 0) {
            // The snippets Array is converted to an Object here.
            page.snippets = await this.getContentSnippets(page.snippets);
        } else {
            page.snippets = {};
        }

        const data = await this.getDynamicData(request);

        const decorations = {
            canonicalURL: request.url.href,
        };

        return Object.assign(decorations, page, data);
    }

    /**
     * @public
     */
    async generateHTML(req) {
        const { href } = req.url;

        if (this.#cachedHTML.has(href)) {
            return this.#cachedHTML.get(href);
        }

        const page = await this.generateJSON(req);
        const template = await this.getTemplate();

        const html = template(page);

        if (this.#cache && this.#cacheable) {
            this.#cachedHTML.set(href, html);
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

        const page = await this.#dataStore.fetch({
            type: 'page',
            id: this.pageId,
        });

        if (!page) {
            throw new NotFoundError(`Page "${ this.pageId }" could not be found`);
        }

        const pageData = Object.assign({}, page.attributes);

        // If the page is cacheable, then we cache the full HTML content utf8 so there is
        // no need to cache this data.
        if (this.#cache && !this.#cacheable) {
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

        const snippets = await this.#blobStore.fetchBatch(snippetIds);

        snippets.forEach((snippet, index) => {
            if (!snippet) {
                throw new NotFoundError(`Page snippet "${ this.pageId }:${ snippetIds[index] }" could not be found`);
            }
        });

        // If the page is cacheable, then we cache the full HTML content utf8 so there is
        // no need to cache this data.
        if (this.#cache && !this.#cacheable) {
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

        const template = await this.#templateStore.fetch(this.#templateId);

        if (!template) {
            throw new NotFoundError(`Template "${ this.#templateId }" could not be found`);
        }

        // If the page is cacheable, then we cache the full HTML content utf8 so there is
        // no need to cache this data.
        if (this.#cache && !this.#cacheable) {
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
    #bindEventListeners() {
        this.eventBus.on('PageDataStore:updateItem', this.#onPageDataStoreUpdate.bind(this));
        this.eventBus.on('PageSnippetStore:updateItem', this.#onPageSnippetStoreUpdate.bind(this));
    }

    /**
     * @private
     */
    #onPageDataStoreUpdate(page) {
        if (page.id === this.pageId) {
            this.#watchedSnippetIds = page.snippets || [];
            const { pageId } = this;
            this.logger.log('detected page data update', { pageId });
            this.deleteCache();
        }
    }

    /**
     * @private
     */
    #onPageSnippetStoreUpdate({ id }) {
        if (this.#watchedSnippetIds.includes(id)) {
            const { pageId } = this;
            this.logger.log('detected snippet update', { pageId, snippet: id });
            this.deleteCache();
        }
    }
}
