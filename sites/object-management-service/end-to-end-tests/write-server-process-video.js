/**
 * This script requires:
 * - The database to be seeded to allow authentication to the write server.
 * - A file in `./tmp/video.mov` to be uploaded to S3.
 * - The testing-123/video.mov object must be removed from S3.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { KixxAssert } from '../dependencies.js';

const {
    isNonEmptyString,
    assert,
    assertEqual,
    assertEmpty,
} = KixxAssert;


const SCOPE_ID = 'testing-123';
const AUTH_TOKEN = '37e70d72-39c9-4db4-a61e-c4af20d093cb';

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
        assertEqual('MP4_H264_AAC', json.data.mediaOutputFormat);

        assertEmpty(json.data.filepath);

        assertEqual('http://localhost:3003/origin/testing-123/latest/video.mov', json.data.links.object.origin);
        assertEqual('https://kixx-stage.imgix.net/testing-123/latest/video.mov', json.data.links.object.cdns[0]);
        assertEqual(`http://localhost:3003/origin/testing-123/${ id }/latest/video.mp4`, json.data.links.mediaOutput.origin);
        assertEqual(`https://kixx-stage.imgix.net/testing-123/${ id }/latest/video.mp4`, json.data.links.mediaOutput.cdns[0]);

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

    const url = new URL(`/objects/${ SCOPE_ID }/video.mov`, 'http://localhost:3003');
    const videoProcessingParams = JSON.stringify({
        type: 'MP4_H264_AAC',
        video: {
            height: 360,
            qualityLevel: 7,
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
    };

    const req = http.request(url, reqOptions, (res) => {
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
