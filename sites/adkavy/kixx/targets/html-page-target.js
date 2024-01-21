import Target from './target.js';


export default class HTMLPageTarget extends Target {

    constructor({ name, methods, page, options }) {
        super({ name, methods });

        Object.defineProperties(this, {
            page: {
                value: page,
            },
            cacheControl: {
                value: options?.cacheControl,
            },
        });
    }

    async handleRequest(request, response) {
        // TODO: Handle cacheControl.
        const { method } = request;
        const { href, pathnameParams } = request.url;
        // Convert searchParams Map to a plain object.
        const searchParams = Object.fromEntries(request.url.searchParams);

        const baseData = {
            links: { canonical: href },
        };

        const args = Object.assign({}, pathnameParams, searchParams);
        const head = method === 'HEAD';
        const requestJSON = request.url.pathname.toLowerCase().endsWith('.json');

        if (requestJSON) {
            const json = await this.page.generateJSON(baseData, args);

            return response.respondWithJSON(200, json, {
                head,
                whiteSpace: true,
            });
        }

        const utf8 = await this.page.generateMarkup(href, baseData, args);
        return response.respondWithHTML(200, utf8, { head });
    }
}
