import { KixxAssert } from '../../dependencies.js';
import BasePage from '../pages/base-page.js';
import { NotFoundError } from '../errors.js';

const { isNonEmptyString, isPlainObject, assert } = KixxAssert;


export default class HTMLPage {

    #logger = null;
    #eventBus = null;
    #dataStore = null;
    #blobStore = null;
    #templateStore = null;
    #noCache = false;

    #pagesById = new Map();

    constructor(spec) {
        assert(isPlainObject(spec), 'isPlainObject');

        const {
            logger,
            eventBus,
            dataStore,
            blobStore,
            templateStore,
        } = spec;

        assert(logger);
        assert(eventBus);
        assert(dataStore);
        assert(blobStore);
        assert(templateStore);

        this.#logger = logger.createChild({ name: 'HTMLPage' });
        this.#eventBus = eventBus;
        this.#dataStore = dataStore;
        this.#blobStore = blobStore;
        this.#templateStore = templateStore;
        this.#noCache = Boolean(spec.noCache);
    }

    initialize() {
        this.#logger.info('initialize', { noCache: this.#noCache });
    }

    handleError(error, request, response) {
        const { requestId } = request;

        switch (error.code) {
            case NotFoundError.CODE:
                this.#logger.warn('page not found error', { error });
                return response.respondWithPlainText(404, 'Page not found\n');
            default:
                this.#logger.error('caught unexpected error', { requestId, error });
                return response.respondWithPlainText(500, 'Unexpected server error\n');
        }
    }

    async renderPage(request, response, options, args) {
        const pageId = options.page;
        const templateId = options.template;
        // TODO: Handle cache-control header.
        // const { cacheControl } = options;

        assert(isNonEmptyString(pageId), 'pageId isNonEmptyString');
        assert(isNonEmptyString(templateId), 'templateId isNonEmptyString');

        const { href } = request.url;

        const baseData = {
            canonicalURL: href,
        };

        const page = await this.#getPageInstance(pageId, templateId);

        const requestJSON = request.url.pathname.endsWith('.json');

        let json;
        let html;

        if (requestJSON) {
            json = await page.generateJSON(baseData, args);
        } else {
            html = await page.generateHTML(href, baseData, args);
        }

        // TODO: Handle HEAD request.

        if (json) {
            return response.respondWithJSON(200, json, { whiteSpace: true });
        }

        return response.respondWithHTML(200, html);
    }

    #getPageInstance(pageId, templateId) {
        // Use the existing page instance if it has already been created.
        if (this.#pagesById.has(pageId)) {
            return this.#pagesById.get(pageId);
        }

        const page = new BasePage({
            pageId,
            templateId,
            logger: this.#logger,
            eventBus: this.#eventBus,
            dataStore: this.#dataStore,
            blobStore: this.#blobStore,
            templateStore: this.#templateStore,
            noCache: this.#noCache,
        });

        // Stash the page instance by pageId to use later.
        this.#pagesById.set(pageId, page);

        // Returns a Promise.
        return page.initialize();
    }
}
