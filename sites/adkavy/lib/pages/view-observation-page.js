import BasePage from './base-page.js';
import Observation from '../models/observation.js';


export default class ViewObservation extends BasePage {

    #datastore = null;

    constructor(spec) {
        const { datastore } = spec;

        const newSpec = Object.assign({}, spec, {
            pageId: 'observations/view',
            templateId: 'observations/view.html',
            isDynamic: true,
            caching: true,
        });

        super(newSpec);

        this.#datastore = datastore;
    }

    async getDynamicData(params) {
        const id = params.observationId;

        const observation = await this.#datastore.load(new Observation({ id }));

        return { observation: observation.toObject() };
    }
}
