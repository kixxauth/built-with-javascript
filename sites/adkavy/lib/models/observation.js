import { KixxAssert } from '../../dependencies.js';
import BaseDataStoreModel from './base-data-store-model.js';


const { assert, isNonEmptyString } = KixxAssert;


export default class Observation extends BaseDataStoreModel {

    static type = 'observation';

    /**
     * @public
     */
    addMediaFromMediaUploadJob(data) {
        return this.addRelationship('media', this.#mapMediaFromMediaUploadJob(data));
    }

    /**
     * @public
     */
    updateMedia(mediaId, attributes) {
        return this.updateRelationship('media', mediaId, attributes);
    }

    /**
     * @public
     */
    validateBeforeSave() {
        // TODO: Validate Observation.
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
                contentType: data.contentType || null,
                contentLength: data.contentLength || null,
                md5Hash: data.md5Hash || null,
                version: data.version || null,
                title: data.title || '',
                details: data.details || '',
                mediaURLs: this.mapMediaURLs(data.mediaURLs),
                posterURLs: this.mapMediaURLs(data.posterURLs),
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
