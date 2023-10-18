import { KixxAssert } from '../dependencies.js';
import BasePage from '../pages/base-page.js';

const { isNonEmptyString, isPlainObject, assert } = KixxAssert;


export default class HTMLPage {

    #caching = true;

    #eventBus = null;
    #pageDataStore = null;
    #pageSnippetStore = null;
    #templateStore = null;

    #pagesById = new Map();

    constructor(spec) {
        assert(isPlainObject(spec));
        assert(spec.eventBus);
        assert(spec.pageDataStore);
        assert(spec.pageSnippetStore);
        assert(spec.templateStore);

        const {
            eventBus,
            pageDataStore,
            pageSnippetStore,
            templateStore,
        } = spec;

        this.#eventBus = eventBus;
        this.#pageDataStore = pageDataStore;
        this.#pageSnippetStore = pageSnippetStore;
        this.#templateStore = templateStore;
    }

    async renderPage(req, res, params) {
        const { pageId } = params;

        assert(isNonEmptyString(pageId));

        const page = this.#getPageInstance(pageId);
        const html = await page.generateHTML(req.pathnameParams);

        return res.respondWithHTML(html);
    }

    #getPageInstance(pageId) {
        if (this.#pagesById.has(pageId)) {
            return this.#pagesById.get(pageId);
        }

        const page = new BasePage({
            pageId,
            templateId: pageId,
            caching: this.#caching,
            isDynamic: false,
            eventBus: this.#eventBus,
            pageDataStore: this.#pageDataStore,
            pageSnippetStore: this.#pageSnippetStore,
            templateStore: this.#templateStore,
        });

        // Stash the page instance by pageId to use later.
        this.#pagesById.set(pageId, page);

        return page;
    }
}
