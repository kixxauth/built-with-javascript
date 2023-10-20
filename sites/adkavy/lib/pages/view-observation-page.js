import BasePage from './base-page.js';


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

        let observation = new Observation({ id });
        observation = await observation.load(this.#datastore);

        return { observation: observation.flatten() };
    }
}
