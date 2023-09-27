import http from 'node:http';
import { randomUUID } from 'node:crypto';
// TODO: Use KixxAssert from root dependencies.
import {
    isNonEmptyString,
    assert,
    assertFalsy,
    assertEqual,
    assertMatches
} from './vendor/kixx-assert/mod.js';


const scopeId = '92a27706-77ce-4127-8aee-d8f4e4f330cb';

function main() {
    const requestId = randomUUID();

    const data = JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'createScopedToken',
        params: { scopeId },
    });

    const url = new URL('/admin-rpc', 'http://localhost:3003');

    const reqOptions = {
        method: 'POST',
        headers: {
            authorization: 'Bearer 57e897f8-3b81-4cde-92c0-66d619b44663',
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(data),
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

    req.write(data);
    req.end();
}

function assertResult(res, utf8, json) {
    const { statusCode, headers } = res;

    assertEqual(200, statusCode);
    assertMatches(/^application\/json/, headers['content-type']);
    assertEqual(Buffer.byteLength(utf8), parseInt(headers['content-length'], 10));

    if (json.error) {
        // eslint-disable-next-line no-console
        console.log(json);
        assertFalsy(json.error, '; The "error" member should be empty.');
    }

    assertEqual('2.0', json.jsonrpc);
    assert(isNonEmptyString(json.id), '; The "id" should be a String');
    assertEqual(scopeId, json.result.scopeId);
    assert(Array.isArray(json.result.accessTokens));

    // eslint-disable-next-line no-console
    console.log('Test pass :D');
}

function printErrorAndExit(message, error) {
    /* eslint-disable no-console */
    console.error(message);
    console.error(error);
    process.exit(1);
    /* eslint-enable no-console */
}

main();
