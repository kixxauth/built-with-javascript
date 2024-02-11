import { slugifyFilename } from '../utils.js';


export default class UploadMediaJob {

    #objectManagementClient = null;

    constructor({ objectManagementClient }) {
        this.#objectManagementClient = objectManagementClient;
    }

    async uploadObservationAttachment(sourceStream, options) {
        const {
            filename,
            contentType,
            contentLength,
        } = options;

        const key = slugifyFilename(`${ contentType }-${ contentLength }-${ filename }`);

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
