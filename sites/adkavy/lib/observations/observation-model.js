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
                    type: item.type,
                    contentType: item.contentType,
                    contentLength: item.contentLength,
                    md5Hash: item.md5Hash,
                    version: item.version,
                    title: item.title,
                    details: item.details,
                    mediaURLs: mapMediaURLs(item.mediaURLs),
                    posterURLs: mapMediaURLs(item.posterURLs),
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
}
