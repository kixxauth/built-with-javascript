import http from 'node:http';
import fsp from 'node:fs/promises';


const DIR_URL = new URL('./', import.meta.url);

const server = http.createServer(handleHttpRequest);

async function handleHttpRequest(req, res) {
    const fileUrl = new URL('./index.html', DIR_URL);
    const body = await fsp.readFile(fileUrl, { encoding: 'utf8' });

    const url = new URL(`http://localhost:3000${ req.url }`);

    logRequest(req, url);

    const chunks = [];

    req.on('data', (chunk) => {
        chunks.push(chunk);
    });

    req.on('end', () => {
        if (chunks.length > 0) {
            const buff = Buffer.concat(chunks);
            console.log('POST body => ');
            console.log(buff.toString('utf8'));
        }

        res.writeHead(200, {
            'content-type': 'text/html',
            'content-length': Buffer.byteLength(body),
        });

        res.write(body);
        res.end();
    });
}

function routeRequest(req, res, url) {
    const matchString = `${ req.method } ${ url.pathname }`;

    switch (matchString) {
        case 'POST /upload':
            break;
        default:
            throw new Error('Not implemented');
    }
}

function logRequest(req, url) {
    const message = `request - ${ req.method } - ${ url.pathname } - ${ url.search }`;

    // eslint-disable-next-line no-console
    console.log(message);
}

server.on('error', (error) => {
    /* eslint-disable no-console */
    console.error('Error event from HTTP server:');
    console.error(error);
    /* eslint-enable no-console */
});

server.listen(3000, () => {
    const { port } = server.address();
    // eslint-disable-next-line no-console
    console.log('Server running on port:', port);
});
