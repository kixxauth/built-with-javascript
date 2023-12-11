/**
 * This script requires a quicktime video file and a JSON config file with shape:
 * {
 *   endpoint,
 *   scope,
 *   token,
 * }
 */
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { KixxAssert } from '../../dependencies.js';
import { createLogger } from '../../lib/logger.js';
import ObjectManagementClient from '../../lib/object-management-client/mod.js';

const { assert, assertEqual, isNonEmptyString } = KixxAssert;


// Should be something like './end-to-end-tests/aws-client/config/good.json'.
if (!process.argv[2]) {
    throw new Error('Config filepath is required argument');
}

// Should be something like './tmp/observation-media/2/some-file.mov'.
if (!process.argv[3]) {
    throw new Error('Media filepath is required argument');
}

const CONFIG_FILEPATH = path.resolve(process.argv[2]);
const MEDIA_FILEPATH = path.resolve(process.argv[3]);


async function main() {
    const config = await loadConfig();

    const logger = createLogger({
        name: 'Test',
        level: 'trace',
        makePretty: true,
    });

    const client = new ObjectManagementClient({
        logger,
        objectServiceEndpoint: config.endpoint,
        objectServiceScope: config.scope,
        objectServiceToken: config.token,
    });

    const sourceStream = fs.createReadStream(MEDIA_FILEPATH);
    const stats = await fsp.stat(MEDIA_FILEPATH);

    const processingParams = {
        type: 'MP4_H264_AAC',
        video: {
            height: 720,
            qualityLevel: 7,
            maxBitrate: 2000000,
        },
        audio: {},
    };

    const res = await client.uploadMedia(sourceStream, {
        contentType: 'video/quicktime',
        contentLength: stats.size,
        key: 'testing/a-video.mov',
        processingParams,
    });

    assert(isNonEmptyString(res.id));
    assertEqual('video/quicktime', res.contentType);
    assertEqual(stats.size, res.contentLength);
    assertEqual('STANDARD', res.storageClass);
    assert(isNonEmptyString(res.md5Hash));
    assert(isNonEmptyString(res.version));
    assertEqual('MP4_H264_AAC', res.mediaOutput.format);
    assert(isNonEmptyString(res.mediaOutput.pathname));
    assertEqual('video.mp4', res.mediaOutput.videoFilename);
    assertEqual('video.00000000.jpg', res.mediaOutput.posterFilename);

    const { object, mediaResource, mediaPoster } = res.links;

    assert(isNonEmptyString(object.origin));
    assert(isNonEmptyString(object.cdns[0]));
    assert(isNonEmptyString(mediaResource.origin));
    assert(isNonEmptyString(mediaResource.cdns[0]));
    assert(isNonEmptyString(mediaPoster.origin));
    assert(isNonEmptyString(mediaPoster.cdns[0]));

    /*
    {
        "type": "remote-object",
        "id": "56cadbd0-166a-4b52-a12e-7ada1583b672",
        "scopeId": "adkavy",
        "key": "testing/a-video.mov",
        "contentType": "video/quicktime",
        "contentLength": 6699955,
        "storageClass": "STANDARD",
        "md5Hash": "0aea39424f4afbe7eea3c8867115ba7e",
        "sha256Hash": "b316e1d54542ed0db632204660b7aabee914e0032af8de1fa8cb9a58ce52eb18",
        "version": "sqiMsP3QzFUbCz6Vk_FeSfbpYFur.zGm",
        "lastModifiedDate": "2023-12-11T11:23:36.909Z",
        "mediaOutput": {
            "format": "MP4_H264_AAC",
            "pathname": "56cadbd0-166a-4b52-a12e-7ada1583b672",
            "videoFilename": "video.mp4",
            "posterFilename": "video.0000000.jpg"
        },
        "links": {
            "object": {
                "origin": "https://media.kixx.name/origin/adkavy/testing/latest/a-video.mov",
                "cdns": [
                    "https://kixx.imgix.net/adkavy/testing/latest/a-video.mov"
                ]
            },
            "mediaResource": {
                "origin": "https://media.kixx.name/origin/adkavy/56cadbd0-166a-4b52-a12e-7ada1583b672/latest/video.mp4",
                "cdns": [
                    "https://kixx.imgix.net/adkavy/56cadbd0-166a-4b52-a12e-7ada1583b672/latest/video.mp4"
                ]
            },
            "mediaPoster": {
                "origin": "https://media.kixx.name/origin/adkavy/56cadbd0-166a-4b52-a12e-7ada1583b672/latest/video.0000000.jpg",
                "cdns": [
                    "https://kixx.imgix.net/adkavy/56cadbd0-166a-4b52-a12e-7ada1583b672/latest/video.0000000.jpg"
                ]
            }
        }
    }
     */
}

async function loadConfig() {
    const utf8 = await fsp.readFile(CONFIG_FILEPATH, { encoding: 'utf8' });
    return JSON.parse(utf8);
}

function printError(message, error) {
    /* eslint-disable no-console */
    console.error(message);
    console.error(error);
    process.exit(1);
    /* eslint-enable no-console */
}

main().catch((error) => {
    printError('uncaught error', error);
});
