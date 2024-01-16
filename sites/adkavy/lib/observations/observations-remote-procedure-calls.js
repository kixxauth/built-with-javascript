import { KixxAssert } from '../../dependencies.js';
import ObservationModel from './observation-model.js';

const { isNonEmptyString } = KixxAssert;


const TZAWARE_DATE = /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}[+-]{1}[\d]{2}:[\d]{2}$/;


export default class ObservationsRemoteProcedureCalls {

    #logger = null;
    #dataStore = null;

    constructor({ logger, dataStore }) {
        this.#dataStore = dataStore;
        this.#logger = logger;
    }

    updateOrCreateObservation(data) {
        const id = data.id;
        const attributes = data.attributes || {};
        const dataStore = this.#dataStore;

        const {
            title,
            observationDateTime,
            reportedDateTime,
        } = attributes;

        // We don't want to prevent submission of an observation because of a validation error,
        // but we do want to know about issues, so we log them out here.

        if (!isNonEmptyString(title)) {
            this.#logger.error('invalid title in updateOrCreateObservation', {
                id,
                title,
            });
        }

        if (!isNonEmptyString(observationDateTime) || !TZAWARE_DATE.test(observationDateTime)) {
            this.#logger.error('invalid observationDateTime in updateOrCreateObservation', {
                id,
                title,
                observationDateTime,
            });
        }

        if (!isNonEmptyString(reportedDateTime) || !TZAWARE_DATE.test(reportedDateTime)) {
            this.#logger.error('invalid reportedDateTime in updateOrCreateObservation', {
                id,
                title,
                reportedDateTime,
            });
        }

        // Returns a promise for the new ObservationModel instance.
        return ObservationModel.createOrUpdate(dataStore, id, attributes);
    }
}
