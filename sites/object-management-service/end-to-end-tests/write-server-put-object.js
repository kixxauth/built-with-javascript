import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
// import { KixxAssert } from '../dependencies.js';

// const {
//     isNonEmptyString,
//     assert,
//     assertFalsy,
//     assertEqual,
//     assertMatches,
// } = KixxAssert;

/**
 * This script requires:
 * - A file in `./tmp/images.jpg` to be uploaded to S3.
 * - The database to be seeded to allow authentication to the write server.
 */

function main() {

    const filepath = path.resolve('./tmp/image.jpg');
    const stats = fs.statSync(filepath);
    const sourceStream = fs.createReadStream(filepath);

    const url = new URL('/objects/testing-123/foo/image.jpg', 'http://localhost:3003');

    const reqOptions = {
        method: 'PUT',
        headers: {
            authorization: 'Bearer 37e70d72-39c9-4db4-a61e-c4af20d093cb',
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

            assertResult(res, utf8, json);
        });
    });

    req.on('error', (error) => {
        printErrorAndExit('request error event', error);
    });

    sourceStream.pipe(req);
}

function assertResult(req, utf8, json) {
    /* eslint-disable no-console */
    console.log('<<< UTF-8 >>>');
    console.log(utf8);
    console.log('<<< JSON >>>');
    console.log(json);

    console.log('');
    console.log('Test pass :D');
    /* eslint-enable no-console */
}

function printErrorAndExit(message, error) {
    /* eslint-disable no-console */
    console.error(message);
    console.error(error);
    process.exit(1);
    /* eslint-enable no-console */
}

main();
