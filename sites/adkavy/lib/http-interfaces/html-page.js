import { KixxAssert } from '../../dependencies.js';
import BasePage from '../pages/base-page.js';
import { NotFoundError } from '../errors.js';

const { isNonEmptyString, isPlainObject, assert } = KixxAssert;


export default class HTMLPage {

    #caching = true;

    #logger = null;
    #eventBus = null;
    #pageDataStore = null;
    #pageSnippetStore = null;
    #templateStore = null;

    #pagesById = new Map();

    constructor(spec) {
        assert(isPlainObject(spec), 'isPlainObject');

        const {
            logger,
            eventBus,
            pageDataStore,
            pageSnippetStore,
            templateStore,
        } = spec;

        this.#logger = logger.createChild({ name: 'HTMLPage' });
        this.#eventBus = eventBus;
        this.#pageDataStore = pageDataStore;
        this.#pageSnippetStore = pageSnippetStore;
        this.#templateStore = templateStore;
    }

    handleError(error, request, response) {
        const { requestId } = request;

        switch (error.code) {
            case NotFoundError.CODE:
                return response.respondWithPlainText(404, 'Page not found\n');
            default:
                this.#logger.error('caught unexpected error', { requestId, error });
                return response.respondWithPlainText(500, 'Unexpected server error\n');
        }
    }

    async renderPage(req, res, params) {
        const pageId = params.page;
        const templateId = params.template;

        assert(isNonEmptyString(pageId), 'pageId isNonEmptyString');
        assert(isNonEmptyString(templateId), 'templateId isNonEmptyString');

        const page = this.#getPageInstance(pageId, templateId);

        const requestJSON = req.url.pathname.endsWith('.json');

        if (requestJSON) {
            const json = await page.generateJSON(req);
            return res.respondWithJSON(200, json, { whiteSpace: true });
        }

        // TODO: Handle HEAD request.
        // TODO: Handle cache-control header.

        const html = await page.generateHTML(req);
        return res.respondWithHTML(200, html);
    }

    #getPageInstance(pageId, templateId) {
        if (this.#pagesById.has(pageId)) {
            return this.#pagesById.get(pageId);
        }

        const page = new BasePage({
            pageId,
            templateId,
            caching: this.#caching,
            isDynamic: false,
            logger: this.#logger,
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
