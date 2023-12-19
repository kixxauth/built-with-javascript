/**
 * This script requiresa JSON config file with shape:
 * {
 *   endpoint,
 * }
 */
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import fsp from 'node:fs/promises';

// Should be something like './end-to-end-tests/aws-client/config/good.json'.
if (!process.argv[2]) {
    throw new Error('Config filepath is required argument');
}

const CONFIG_FILEPATH = path.resolve(process.argv[2]);
const PORT = 3433;


async function main() {
    const config = await loadConfig();

    const server = http.createServer((req, res) => {
        const url = new URL(req.url, config.endpoint);
        const { method, headers } = req;

        headers.host = url.host;

        const options = {
            method,
            headers,
            // Required to get around the certificate authority for the *.kixx.name SSL cert.
            rejectUnauthorized: false,
        };

        const remoteRequest = https.request(url, options, (remoteResponse) => {
            res.writeHead(remoteResponse.statusCode, remoteResponse.statusMessage, res.headers);
            remoteResponse.pipe(res);
        });

        req.pipe(remoteRequest);
    });

    server.listen(PORT);
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
