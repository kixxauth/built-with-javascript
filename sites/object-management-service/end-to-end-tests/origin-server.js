/**
 * This script requires:
 * - The database to be seeded to allow authentication to the write server.
 * - A file in `./tmp/image.jpg` to be uploaded to S3 at testing-123/foo/image.jpg.
 */
import http from 'node:http';
import { KixxAssert } from '../dependencies.js';

const {
    isNonEmptyString,
    assert,
    assertEqual,
    assertMatches,
    assertUndefined,
} = KixxAssert;


const SCOPE_ID = 'testing-123';

async function main() {
    /* eslint-disable no-console */
    await getObjectHeadWhichDoesNotExist();
    console.log('getObjectHeadWhichDoesNotExist() passed');
    await getLatestObjectHead();
    console.log('getLatestObjectHead() passed');
    await getObjectWhichDoesNotExist();
    console.log('getObjectHeadWhichDoesNotExist() passed');
    await getLatestObject();
    console.log('getLatestObject() passed');
    /* eslint-enable no-console */
}

function getObjectHeadWhichDoesNotExist() {
    return new Promise((resolve, reject) => {
        const headers = {};

        makeRequest('HEAD', headers, 'latest', 'non-existing.jpg', (error, res) => {
            if (error) {
                reject(error);
            } else {
                try {
                    assertEqual(404, res.statusCode);
                    assertEqual('Not Found', res.statusMessage);
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
}

function getLatestObjectHead() {
    return new Promise((resolve, reject) => {
        const headers = {};

        makeRequest('HEAD', headers, 'latest', 'image.jpg', (error, res) => {
            if (error) {
                reject(error);
            } else {
                try {
                    assertEqual(200, res.statusCode);
                    assertEqual('OK', res.statusMessage);
                    assertEqual('1571755', res.headers['content-length']);
                    assertEqual('image/jpeg', res.headers['content-type']);
                    // Date header should be like: "Tue, 07 Nov 2023 11:06:52 GMT"
                    assert(isNonEmptyString(res.headers.date));
                    assertMatches(/^[A-Za-z]{3}, [\d]{2} [A-Za-z]{3} [\d]{4} [\d]{2}:[\d]{2}:[\d]{2} GMT$/, res.headers.date);
                    assertEqual('public, max-age=31536000', res.headers['cache-control']);
                    assertEqual('0f36d4c3822d68f56f88fe595ab9ef87', res.headers['etag']);
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
}

function getObjectWhichDoesNotExist() {
    return new Promise((resolve, reject) => {
        const headers = {};

        makeRequest('GET', headers, 'latest', 'non-existing.jpg', (error, res) => {
            if (error) {
                reject(error);
            } else {
                try {
                    assertEqual(404, res.statusCode);
                    assertEqual('Not Found', res.statusMessage);
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
}

function getLatestObject() {
    return new Promise((resolve, reject) => {
        const headers = {};

        makeRequest('GET', headers, 'latest', 'image.jpg', (error, res) => {
            if (error) {
                reject(error);
                return;
            }

            try {
                assertEqual(200, res.statusCode);
                assertEqual('OK', res.statusMessage);
                assertEqual('1571755', res.headers['content-length']);
                assertEqual('image/jpeg', res.headers['content-type']);
                // Date header should be like: "Tue, 07 Nov 2023 11:06:52 GMT"
                assert(isNonEmptyString(res.headers.date));
                assertMatches(/^[A-Za-z]{3}, [\d]{2} [A-Za-z]{3} [\d]{4} [\d]{2}:[\d]{2}:[\d]{2} GMT$/, res.headers.date);
                assertEqual('public, max-age=31536000', res.headers['cache-control']);
                assertEqual('0f36d4c3822d68f56f88fe595ab9ef87', res.headers['etag']);
            } catch (err) {
                reject(err);
                return;
            }

            // eslint-disable-next-line no-shadow
            const headers = {
                'if-none-match': '0f36d4c3822d68f56f88fe595ab9ef87',
            };

            // eslint-disable-next-line no-shadow
            makeRequest('GET', headers, 'latest', 'image.jpg', (error, res) => {
                if (error) {
                    reject(error);
                    return;
                }

                try {
                    assertEqual(304, res.statusCode);
                    assertEqual('Not Modified', res.statusMessage);
                    assertEqual('0', res.headers['content-length']);
                    assertUndefined(res.headers['content-type']);
                    // Date header should be like: "Tue, 07 Nov 2023 11:06:52 GMT"
                    assert(isNonEmptyString(res.headers.date));
                    assertMatches(/^[A-Za-z]{3}, [\d]{2} [A-Za-z]{3} [\d]{4} [\d]{2}:[\d]{2}:[\d]{2} GMT$/, res.headers.date);
                    assertEqual('public, max-age=31536000', res.headers['cache-control']);
                    assertEqual('0f36d4c3822d68f56f88fe595ab9ef87', res.headers['etag']);
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            });
        });
    });
}

function makeRequest(method, headers, version, filename, callback) {

    const url = new URL(`/origin/${ SCOPE_ID }/foo/${ version }/${ filename }`, 'http://localhost:3003');

    const req = http.request(url, { method, headers }, (res) => {
        const chunks = [];

        res.on('error', (error) => {
            callback(error);
        });

        res.on('data', (chunk) => {
            chunks.push(chunk);
        });

        res.on('end', () => {
            const contentLength = Buffer.concat(chunks).length;
            callback(null, res, contentLength);
        });
    });

    req.on('error', (error) => {
        callback(error);
    });

    req.end();
}

main().catch((error) => {
    /* eslint-disable no-console */
    console.error('Caught testing Error:');
    console.error(error);
    /* eslint-enable no-console */
});
