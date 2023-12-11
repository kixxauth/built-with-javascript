import { KixxAssert } from '../../dependencies.js';
import BaseDataStoreModel from './base-data-store-model.js';


const { assert, isNonEmptyString } = KixxAssert;


export default class Observation extends BaseDataStoreModel {

    static type = 'observation';

    /**
     * @private
     */
    mapAttributes(attrs) {
        attrs = attrs || {};

        return {
            // Tempory for CSV record correlation during initial DB seeding.
            csv: attrs.csv || {},
            // A person name.
            name: attrs.name || null,
            // A person email.
            email: attrs.email || null,
            title: attrs.title || null,
            observationDateTime: attrs.observationDateTime || null,
            // The date time string represented when this record was initially created.
            reportedDateTime: attrs.reportedDateTime || null,
            travelMode: attrs.travelMode || null,
            triggeredAvalanche: Boolean(attrs.triggeredAvalanche),
            observedAvalanche: Boolean(attrs.observedAvalanche),
            location: attrs.location || null,
            elevation: attrs.elevation || null,
            aspect: attrs.aspect || null,
            redFlags: attrs.redFlags || [],
            details: attrs.details || null,
            triggeredAvalancheType: attrs.triggeredAvalancheType || null,
            triggeredAvalancheSize: attrs.triggeredAvalancheSize || null,
            triggeredAvalancheComments: attrs.triggeredAvalancheComments || null,
            observedAvalancheType: attrs.observedAvalancheType || null,
            observedAvalancheSize: attrs.observedAvalancheSize || null,
            observedAvalancheElevation: attrs.observedAvalancheElevation || null,
            observedAvalancheAspect: attrs.observedAvalancheAspect || null,
            observedAvalancheComments: attrs.observedAvalancheComments || null,
        };
    }

    /**
     * @public
     */
    getMediaItemByFilename(filename) {
        const item = this.relationships.media.find(({ attributes }) => {
            return attributes.filename === filename;
        });

        return item || null;
    }

    /**
     * @public
     */
    addMediaFromMediaUploadJob(data) {
        return this.addRelationship('media', this.#mapMediaFromMediaUploadJob(data));
    }

    /**
     * @public
     */
    updateMedia(filename, attributes) {
        const item = this.getMediaItemByFilename(filename);

        if (item) {
            return this.updateRelationship('media', item.id, attributes);
        }

        return null;
    }

    /**
     * @public
     */
    validateBeforeSave() {
        // TODO: Validate Observation.
    }

    /**
     * @public
     */
    assignDerivedDatastoreProperties(item) {
        item.key_observationDateTime = this.attributes.observationDateTime;
    }

    /**
     * @private
     */
    #mapMediaFromMediaUploadJob(data) {
        assert(isNonEmptyString(data.id), 'Observation mediaItem id is a String');

        return Object.freeze({
            id: data.id,
            type: 'media',
            attributes: {
                filename: data.filename,
                contentType: data.contentType || null,
                contentLength: data.contentLength || null,
                md5Hash: data.md5Hash || null,
                version: data.version || null,
                title: data.title || '',
                details: data.details || '',
                mediaURLs: this.#mapMediaURLs(data.mediaURLs),
                posterURLs: this.#mapMediaURLs(data.posterURLs),
            },
        });
    }

    /**
     * @private
     */
    #mapMediaURLs(urls) {
        urls = urls || {};

        const origin = urls.origin || null;
        const cdns = urls.cdns || [];

        assert(Array.isArray(cdns), 'Observation mediaItems URLs cdns is an Array');

        return Object.freeze({ origin, cdns });
    }
}
