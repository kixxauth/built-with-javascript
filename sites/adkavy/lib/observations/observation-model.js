import { KixxAssert } from '../../dependencies.js';
import Kixx from '../../kixx/mod.js';

const { isNonEmptyString, isNumberNotNaN, isPlainObject } = KixxAssert;
const { DataStoreModel } = Kixx.Stores;


export default class ObservationModel extends DataStoreModel {

    static type = 'observation';

    mapAttributes(attrs) {

        let media = [];

        if (Array.isArray(attrs.media)) {
            media = attrs.media.map(mapMediaItem);
        }

        return {
            name: attrs.name,
            email: attrs.email,
            title: attrs.title,
            observationDateTime: attrs.observationDateTime,
            reportedDateTime: attrs.reportedDateTime,
            travelMode: attrs.travelMode,
            location: attrs.location,
            elevation: attrs.elevation,
            aspect: attrs.aspect,
            redFlags: attrs.redFlags,
            triggeredAvalanche: attrs.triggeredAvalanche,
            observedAvalanche: attrs.observedAvalanche,
            triggeredAvalancheType: attrs.triggeredAvalancheType,
            triggeredAvalancheSize: attrs.triggeredAvalancheSize,
            triggeredAvalancheComments: attrs.triggeredAvalancheComments,
            observedAvalancheType: attrs.observedAvalancheType,
            observedAvalancheSize: attrs.observedAvalancheSize,
            observedAvalancheElevation: attrs.observedAvalancheElevation,
            observedAvalancheAspect: attrs.observedAvalancheAspect,
            observedAvalancheComments: attrs.observedAvalancheComments,
            details: attrs.details,
            media,
        };
    }

    getMediaItemById(id) {
        if (Array.isArray(this.attributes.media)) {
            return this.attributes.media.find((item) => {
                return item.id === id;
            }) || null;
        }

        return null;
    }

    updateOrCreateMediaItem(item) {
        // If the item does not have an id, this is a no-op.
        if (!isNonEmptyString(item.id)) {
            return this;
        }

        const mediaItems = Array.isArray(this.attributes.media)
            ? this.attributes.media.slice()
            : [];

        const existingIndex = mediaItems.findIndex(({ id }) => {
            return id === item.id;
        });

        const newItem = mapMediaItem(item);

        if (existingIndex === -1) {
            // The media item does exist yet. Push it.
            mediaItems.push(newItem);
        } else {
            // The media item already exists. Merge it.
            mediaItems[existingIndex] = Object.assign({}, mediaItems[existingIndex], newItem);
        }

        return this.updateAttributes({ media: mediaItems });
    }

    removeMediaItem(id) {
        const mediaItems = Array.isArray(this.attributes.media)
            ? this.attributes.media.slice()
            : [];

        const index = mediaItems.findIndex((item) => {
            return item.id === id;
        });

        if (index !== -1) {
            mediaItems.splice(index, 1);
        }

        return this.updateAttributes({ media: mediaItems });
    }

    toView() {
        const { id } = this;

        const {
            title,
            observationDateTime,
            name,
            location,
            elevation,
            aspect,
            travelMode,
            redFlags,
            triggeredAvalanche,
            observedAvalanche,
            triggeredAvalancheType,
            triggeredAvalancheSize,
            triggeredAvalancheComments,
            observedAvalancheType,
            observedAvalancheSize,
            observedAvalancheComments,
            details,
        } = this.attributes;

        let observationType = 'observation';
        if (triggeredAvalanche) {
            observationType = 'triggered-avalanche';
        } else if (observedAvalanche) {
            observationType = 'observed-avalanche';
        }

        const hasMedia = Array.isArray(this.attributes.media) && this.attributes.media.length > 0;

        let media = [];
        if (hasMedia) {
            media = this.attributes.media.map((item) => {
                return {
                    type: item.type,
                    title: item.title,
                    details: item.details,
                    isVideo: item.type === 'video',
                    isImage: item.type === 'image',
                    contentType: item.contentType,
                    format: item.mediaOutput?.format,
                    contentLength: item.contentLength,
                    urls: {
                        media: item.mediaURLs?.cdns?.[0],
                        poster: item.posterURLs?.cdns?.[0],
                    },
                };
            });
        }

        return {
            id,
            title,
            observationDateTime,
            observationType,
            hasMedia,
            name,
            location,
            elevation,
            aspect,
            travelMode,
            redFlags,
            triggeredAvalanche,
            observedAvalanche,
            triggeredAvalancheType,
            triggeredAvalancheSize,
            triggeredAvalancheComments,
            observedAvalancheType,
            observedAvalancheSize,
            observedAvalancheComments,
            details,
            media,
        };
    }
}

function mapMediaItem(item) {
    const newItem = { id: item.id };

    function mapMediaURLs(urls) {
        const origin = urls?.origin || null;
        const cdns = urls?.cdns || [];

        return Object.freeze({ origin, cdns });
    }

    if (isNonEmptyString(item.contentType)) {
        newItem.type = item.contentType.split('/')[0];
        newItem.contentType = item.contentType;
    }
    if (isNumberNotNaN(item.contentLength)) {
        newItem.contentLength = item.contentLength;
    }
    if (isNonEmptyString(item.md5Hash)) {
        newItem.md5Hash = item.md5Hash;
    }
    if (isNonEmptyString(item.version)) {
        newItem.version = item.version;
    }
    if (isPlainObject(item.mediaOutput)) {
        newItem.mediaOutput = item.mediaOutput;
    }
    if (isPlainObject(item.mediaURLs)) {
        newItem.mediaURLs = mapMediaURLs(item.mediaURLs);
    }
    if (isPlainObject(item.posterURLs)) {
        newItem.posterURLs = mapMediaURLs(item.posterURLs);
    }
    if (isNonEmptyString(item.title)) {
        newItem.title = item.title;
    }
    if (isNonEmptyString(item.details)) {
        newItem.details = item.details;
    }

    return newItem;
}
