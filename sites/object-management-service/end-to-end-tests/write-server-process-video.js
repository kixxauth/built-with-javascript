/**
 * This script requires:
 * - The database to be seeded to allow authentication to the write server.
 * - A file in `./tmp/video.mov` to be uploaded to S3.
 * - The testing-123/video.mov object must be removed from S3.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { KixxAssert } from '../dependencies.js';

const {
    isNonEmptyString,
    assert,
    assertEqual,
    assertEmpty,
} = KixxAssert;


// Choose an endpoint.
// const ENDPOINT = 'https://media.kixx.name';
const ENDPOINT = 'http://localhost:3003';

// The default auth token should match the scope token in
// seeds/main_document.json for development. Or pass in a different
// token as a command line argument.
const AUTH_TOKEN = process.argv[2] || '37e70d72-39c9-4db4-a61e-c4af20d093cb';

// Choose a scopeId.
// const SCOPE_ID = 'adkavy';
const SCOPE_ID = 'testing-123';


function main() {
    let id;
    let md5Hash;

    // Upload the object the first time, before it exists in S3.
    // eslint-disable-next-line no-console
    console.log('Uploading the test video.');
    uploadObject((req, utf8, json) => {
        /* eslint-disable no-console */
        console.log('Response JSON:');
        console.log(JSON.stringify(json, null, 4));
        /* eslint-enable no-console */

        id = json.data.id;
        md5Hash = json.data.md5Hash;

        assertEqual('remote-object', json.data.type);
        assert(isNonEmptyString(id));
        assert(isNonEmptyString(md5Hash));
        assertEqual(SCOPE_ID, json.data.scopeId);
        assertEqual('video.mov', json.data.key);
        assertEqual('video/quicktime', json.data.contentType);
        assertEqual('STANDARD', json.data.storageClass);
        assertEqual('MP4_H264_AAC', json.data.mediaOutput.format);

        assertEmpty(json.data.filepath);

        assertEqual(`${ ENDPOINT }/origin/${ SCOPE_ID }/latest/video.mov`, json.data.links.object.origin);
        assertEqual(`https://kixx.imgix.net/${ SCOPE_ID }/latest/video.mov`, json.data.links.object.cdns[0]);
        assertEqual(`${ ENDPOINT }/origin/${ SCOPE_ID }/${ id }/latest/video.mp4`, json.data.links.mediaResource.origin);
        assertEqual(`https://kixx.imgix.net/${ SCOPE_ID }/${ id }/latest/video.mp4`, json.data.links.mediaResource.cdns[0]);
        assertEqual(`${ ENDPOINT }/origin/${ SCOPE_ID }/${ id }/latest/video.0000000.jpg`, json.data.links.mediaPoster.origin);
        assertEqual(`https://kixx.imgix.net/${ SCOPE_ID }/${ id }/latest/video.0000000.jpg`, json.data.links.mediaPoster.cdns[0]);

        /* eslint-disable no-console */
        console.log('Upload complete');
        console.log('');
        console.log('Test Pass :D (But, watch the server logs to ensure the video processing job completes ;-)');
        /* eslint-enable no-console */
    });
}

function uploadObject(callback) {
    const filepath = path.resolve('./tmp/video.mov');
    const stats = fs.statSync(filepath);
    const sourceStream = fs.createReadStream(filepath);

    const url = new URL(`/objects/${ SCOPE_ID }/video.mov`, ENDPOINT);
    const videoProcessingParams = JSON.stringify({
        type: 'MP4_H264_AAC',
        video: {
            height: 720,
            qualityLevel: 8,
            maxBitrate: 4000000,
        },
        audio: {},
    });

    const reqOptions = {
        method: 'PUT',
        headers: {
            authorization: `Bearer ${ AUTH_TOKEN }`,
            'content-type': 'video/quicktime',
            'content-length': stats.size,
            'x-kc-video-processing': Buffer.from(videoProcessingParams, 'utf8').toString('base64'),
            'x-kc-storage-class': 'STANDARD',
        },
        // Required to get around the certificate authority for the *.kixx.name SSL cert.
        rejectUnauthorized: false,
    };

    const proto = url.protocol === 'https:' ? https : http;

    const req = proto.request(url, reqOptions, (res) => {
        const chunks = [];

        res.on('error', (error) => {
            printErrorAndExit('response error event', error);
        });

        res.on('data', (chunk) => {
            chunks.push(chunk);
        });

        res.on('end', () => {
            const utf8 = Buffer.concat(chunks).toString('utf8');
            let json = {};

            try {
                json = JSON.parse(utf8);
            } catch (error) {
                /* eslint-disable no-console */
                console.error('JSON parsing error:');
                console.error(error);
                /* eslint-enable no-console */
            }

            callback(res, utf8, json);
        });
    });

    req.on('error', (error) => {
        printErrorAndExit('request error event', error);
    });

    sourceStream.pipe(req);
}

function printErrorAndExit(message, error) {
    /* eslint-disable no-console */
    console.error(message);
    console.error(error);
    process.exit(1);
    /* eslint-enable no-console */
}

main();
