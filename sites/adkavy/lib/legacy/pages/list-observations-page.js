import BasePage from './base-page.js';

export default class ListObservationsPage extends BasePage {

    initialize() {
        // TODO: Implement data store events and test them out for caching
        this.eventBus.on('DataStore:updateItem', this.#onObservationUpdate.bind(this));
    }

    getDynamicData(/* args */) {
    }

    #onObservationUpdate() {
        // TODO: Delete the page cache.
    }
}
