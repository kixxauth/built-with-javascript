import Target from './target.js';


export default class HTMLPageTarget extends Target {

    #page = null;
    #options = {};

    constructor({ methods, page, options }) {
        super({ methods });
        this.#page = page;

        Object.defineProperties(this, {
            cacheControl: {
                value: options?.cacheControl,
            },
        });
    }

    async handleRequest(request, response) {
        const { href, pathnameParams } = request.url;

        const baseData = {
            canonicalURL: href,
        };

        const requestJSON = request.url.pathname.endsWith('.json');

        let json;
        let html;

        if (requestJSON) {
            json = await this.#page.generateJSON(baseData, pathnameParams);
        } else {
            html = await this.#page.generateHTML(href, baseData, pathnameParams);
        }

        // TODO: Handle HEAD request.
        // TODO: Handle cacheControl.

        if (json) {
            return response.respondWithJSON(200, json, { whiteSpace: true });
        }

        return response.respondWithHTML(200, html);
    }
}
