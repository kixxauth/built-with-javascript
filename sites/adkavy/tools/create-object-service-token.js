import http from 'node:http';
import { randomUUID } from 'node:crypto';


const ENDPOINT = 'http://localhost:3003';

const scopeId = 'adkavy-development';


function main() {
    const requestId = randomUUID();

    const data = JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'createScopedToken',
        params: { scopeId },
    });

    const url = new URL('/admin-rpc', ENDPOINT);

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
            const json = JSON.parse(utf8);
            // eslint-disable-next-line no-console
            console.log(JSON.stringify(json, null, 4));
        });
    });

    req.on('error', (error) => {
        printErrorAndExit('request error event', error);
    });

    req.write(data);
    req.end();
}

function printErrorAndExit(message, error) {
    /* eslint-disable no-console */
    console.error(message);
    console.error(error);
    process.exit(1);
    /* eslint-enable no-console */
}

main();
