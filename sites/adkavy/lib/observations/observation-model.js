import Kixx from '../../kixx/mod.js';

const { DataStoreModel } = Kixx.Stores;


export default class ObservationModel extends DataStoreModel {

    static type = 'observation';

    mapAttributes(attrs) {

        function mapMediaURLs(urls) {
            urls = urls || {};

            const origin = urls.origin || null;
            const cdns = urls.cdns || [];

            return Object.freeze({ origin, cdns });
        }

        let media = [];

        if (Array.isArray(attrs.media)) {
            media = attrs.media.map((item) => {
                return {
                    id: item.id,
                    type: item.type,
                    contentType: item.contentType,
                    contentLength: item.contentLength,
                    md5Hash: item.md5Hash,
                    version: item.version,
                    mediaOutput: item.mediaOutput,
                    mediaURLs: mapMediaURLs(item.mediaURLs),
                    posterURLs: mapMediaURLs(item.posterURLs),
                    title: item.title,
                    details: item.details,
                };
            });
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

    updateMediaItem(item) {
        const mediaItems = Array.isArray(this.attributes.media)
            ? this.attributes.media.slice()
            : [];

        const existingIndex = mediaItems.findIndex(({ id }) => {
            return id === item.id;
        });

        const newItem = {
            id: item.id,
            type: item.contentType.split('/')[0],
            contentType: item.contentType,
            contentLength: item.contentLength,
            md5Hash: item.md5Hash,
            version: item.version,
            mediaOutput: item.mediaOutput,
            mediaURLs: item.mediaURLs,
            posterURLs: item.posterURLs,
        };

        if (existingIndex === -1) {
            // The media item does exist yet. Push it.
            mediaItems.push(newItem);
        } else {
            // The media item already exists. Merge it.
            mediaItems[existingIndex] = Object.assign({}, mediaItems[existingIndex], newItem);
        }

        return this.updateAttributes({ media: mediaItems });
    }

}
