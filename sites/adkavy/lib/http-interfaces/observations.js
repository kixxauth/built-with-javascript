import { KixxAssert } from '../dependencies.js';
import ViewObservationPage from '../pages/view-observation-page.js';

const { isPlainObject, assert } = KixxAssert;


export default class Observations {

    #viewObservationPage = null;

    constructor(spec) {
        assert(isPlainObject(spec), 'isPlainObject');

        const {
            logger,
            eventBus,
            pageDataStore,
            pageSnippetStore,
            templateStore,
        } = spec;

        this.#viewObservationPage = new ViewObservationPage({
            logger,
            eventBus,
            pageDataStore,
            pageSnippetStore,
            templateStore,
        });
    }

    async viewObservation(req, res) {
        const id = req.pathnameParams.observationId;
        const page = this.#viewObservationPage;
        const requestJSON = req.url.pathname.endsWith('.json');

        if (requestJSON) {
            const json = await page.generateJSON({ id });
            return res.respondWithJSON(json);
        }

        const html = await page.generateHTML({ id });
        return res.respondWithHTML(html);
    }
}
