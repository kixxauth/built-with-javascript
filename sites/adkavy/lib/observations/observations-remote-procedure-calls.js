import { KixxAssert } from '../../dependencies.js';
import Kixx from '../../kixx/mod.js';
import ObservationModel from './observation-model.js';

const { isNonEmptyString, isPlainObject } = KixxAssert;
const { BadRequestError } = Kixx.Errors;


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
            this.#logger.warn('invalid title in updateOrCreateObservation', {
                id,
                title,
            });
        }

        if (!isNonEmptyString(observationDateTime) || !TZAWARE_DATE.test(observationDateTime)) {
            this.#logger.warn('invalid observationDateTime in updateOrCreateObservation', {
                id,
                title,
                observationDateTime,
            });
        }

        if (!isNonEmptyString(reportedDateTime) || !TZAWARE_DATE.test(reportedDateTime)) {
            this.#logger.warn('invalid reportedDateTime in updateOrCreateObservation', {
                id,
                title,
                reportedDateTime,
            });
        }

        if (attributes.media) {
            throw new BadRequestError(
                'Cannot update observation.media items in updateOrCreateObservation'
            );
        }

        // Returns a promise for the new ObservationModel instance.
        return ObservationModel.createOrUpdate(dataStore, id, attributes);
    }

    async updateOrCreateMediaItem(observationId, mediaItem) {
        if (!isNonEmptyString(observationId)) {
            throw new BadRequestError('observationId must be a non empty string');
        }
        if (!isPlainObject(mediaItem) && !isNonEmptyString(mediaItem.id)) {
            throw new BadRequestError('media item id must be a non empty string');
        }

        const dataStore = this.#dataStore;

        let observation = await ObservationModel.load(dataStore, observationId);

        if (!observation) {
            throw new BadRequestError(`Observation "${ observationId }" does not exist`);
        }

        observation = observation.updateOrCreateMediaItem(mediaItem);

        const newObservation = await observation.save(dataStore);

        return newObservation.getMediaItemById(mediaItem.id);
    }

    async updateMediaItems(observationId, mediaItems) {
        if (!isNonEmptyString(observationId)) {
            throw new BadRequestError('observationId must be a non empty string');
        }
        if (!Array.isArray(mediaItems)) {
            throw new BadRequestError('mediaItems must be an array');
        }

        const dataStore = this.#dataStore;

        let observation = await ObservationModel.load(dataStore, observationId);

        if (!observation) {
            throw new BadRequestError(`Observation "${ observationId }" does not exist`);
        }

        for (const item of mediaItems) {
            if (!isPlainObject(item) && !isNonEmptyString(item.id)) {
                throw new BadRequestError('media item id must be a non empty string');
            }
            observation = observation.updateOrCreateMediaItem(item);
        }

        const newObservation = await observation.save(dataStore);

        return newObservation.attributes.media;
    }

    async removeMediaItem(observationId, id) {
        if (!isNonEmptyString(observationId)) {
            throw new BadRequestError('observationId must be a non empty string');
        }
        if (!isNonEmptyString(id)) {
            throw new BadRequestError('media item id must be a non empty string');
        }

        const dataStore = this.#dataStore;

        let observation = await ObservationModel.load(dataStore, observationId);

        if (!observation) {
            throw new BadRequestError(`Observation "${ observationId }" does not exist`);
        }

        observation = observation.removeMediaItem(id);

        await observation.save(dataStore);

        return true;
    }
}
