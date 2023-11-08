/**
 * This script requires:
 * - The database to be seeded to allow authentication to the write server.
 * - A file in `./tmp/image.jpg` to be uploaded to S3.
 * - The testing-123/foo/image.jpg object must be removed from S3.
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
    console.log('Uploading the test object for the first time.');
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
        assertEqual('foo/image.jpg', json.data.key);
        assertEqual('image/jpeg', json.data.contentType);
        assert(isNonEmptyString(json.data.version));
        assert(isNonEmptyString(json.data.lastModifiedDate));
        assertEqual('STANDARD', json.data.storageClass);
        assertEqual(null, json.data.mediaOutputFormat);

        assertEmpty(json.data.filepath);

        assertEqual('http://localhost:3003/origin/testing-123/foo/latest/image.jpg', json.data.links.object.origin);
        assertEqual('https://kixx-stage.imgix.net/testing-123/foo/latest/image.jpg', json.data.links.object.cdns[0]);
        assertEqual(null, json.data.links.mediaOutput.origin);
        assertEmpty(json.data.links.mediaOutput.cdns);

        /* eslint-disable no-console */
        console.log('First upload test complete');
        console.log('');
        /* eslint-enable no-console */

        // eslint-disable-next-line no-console
        console.log('Uploading the test object for the second time.');
        // eslint-disable-next-line no-shadow
        uploadObject((req, utf8, json) => {
            /* eslint-disable no-console */
            console.log('Response JSON:');
            console.log(JSON.stringify(json, null, 4));
            /* eslint-enable no-console */

            assertEqual('remote-object', json.data.type);
            assertEqual(id, json.data.id);
            assertEqual(SCOPE_ID, json.data.scopeId);
            assertEqual(md5Hash, json.data.md5Hash);
            assertEqual('foo/image.jpg', json.data.key);
            assertEqual('image/jpeg', json.data.contentType);
            assert(isNonEmptyString(json.data.version));
            assert(isNonEmptyString(json.data.lastModifiedDate));
            assertEqual(null, json.data.mediaOutputFormat);

            assertEmpty(json.data.filepath);

            assertEqual('http://localhost:3003/origin/testing-123/foo/latest/image.jpg', json.data.links.object.origin);
            assertEqual('https://kixx-stage.imgix.net/testing-123/foo/latest/image.jpg', json.data.links.object.cdns[0]);
            assertEqual(null, json.data.links.mediaOutput.origin);
            assertEmpty(json.data.links.mediaOutput.cdns);

            /* eslint-disable no-console */
            console.log('Second upload test complete');
            console.log('');
            console.log('Test Pass :D');
            /* eslint-enable no-console */
        });
    });
}

function uploadObject(callback) {
    const filepath = path.resolve('./tmp/image.jpg');
    const stats = fs.statSync(filepath);
    const sourceStream = fs.createReadStream(filepath);

    const url = new URL(`/objects/${ SCOPE_ID }/foo/image.jpg`, 'http://localhost:3003');

    const reqOptions = {
        method: 'PUT',
        headers: {
            authorization: `Bearer ${ AUTH_TOKEN }`,
            'content-type': 'image/jpeg',
            'content-length': stats.size,
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
