export default class UploadMediaJob {

    #logger = null;
    #objectManagementClient = null;

    constructor({ logger, objectManagementClient }) {
        this.#logger = logger.createChild({ name: 'UploadMediaJob' });
        this.#objectManagementClient = objectManagementClient;
    }

    async uploadObservationAttachment(sourceStream, options) {
        const {
            observationId,
            index,
            filename,
            contentType,
            contentLength,
        } = options;

        const ext = filename.split('.').pop();
        let key = `observations/${ observationId }/${ ('000' + index).slice(-3) }`;

        if (ext) {
            key = `${ key }.${ ext }`;
        }

        // Always include processing params. These values will only be used if the
        // content type triggers media processing (video transcoding).
        const processingParams = {
            type: 'MP4_H264_AAC',
            video: {
                height: 720,
                qualityLevel: 7,
                maxBitrate: 2000000,
            },
            audio: {},
        };

        const res = await this.#objectManagementClient.uploadMedia(sourceStream, {
            contentType,
            contentLength,
            key,
            processingParams,
        });

        if (!res) {
            return null;
        }

        const { links } = res;

        let mediaURLs;
        let posterURLs;

        if (links.mediaResource && links.mediaResource.origin) {
            mediaURLs = {
                origin: links.mediaResource.origin,
                cdns: links.mediaResource.cdns || [],
            };
        } else {
            mediaURLs = {
                origin: links.object.origin,
                cdns: links.object.cdns,
            };
        }

        if (links.mediaPoster && links.mediaPoster.origin) {
            posterURLs = {
                origin: links.mediaPoster.origin,
                cdns: links.mediaPoster.cdns || [],
            };
        } else {
            posterURLs = null;
        }

        return {
            id: res.id,
            contentType: res.contentType,
            contentLength,
            md5Hash: res.md5Hash,
            version: res.version,
            mediaOutput: res.mediaOutput,
            mediaURLs,
            posterURLs,
        };
    }
}
