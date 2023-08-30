import http from 'node:http';
import fsp from 'node:fs/promises';
import fs from 'node:fs';


const DIR_URL = new URL('./', import.meta.url);

const server = http.createServer(handleHttpRequest);

function handleHttpRequest(req, res) {
    const url = new URL(`http://localhost:3000${ req.url }`);
    logRequest(req, url);
    routeRequest(req, res, url);
}

function routeRequest(req, res, url) {
    const matchString = `${ req.method } ${ url.pathname }`;

    switch (matchString) {
        case 'GET /':
            sendIndexPage(req, res);
            break;
        default:
            if (matchString.startsWith('PUT /upload-new-file/')) {
                acceptFile(req, res, url);
            } else {
                sendNotFound(req, res);
            }
    }
}

async function sendIndexPage(req, res) {
    const fileUrl = new URL('./index.html', DIR_URL);
    const body = await fsp.readFile(fileUrl, { encoding: 'utf8' });
    sendHtml(res, body);
}

function acceptFile(req, res, url) {
    const fileName = url.pathname.split('/').pop();
    const contentType = req.headers['content-type'];
    const destinationUrl = new URL(`./tmp/source-videos/${ fileName }`, DIR_URL);
    const writeStream = fs.createWriteStream(destinationUrl);

    req.on('end', () => {
        const body = JSON.stringify({
            fileName,
            contentType,
        });

        res.writeHead(201, {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(body),
        });

        res.write(body);
        res.end();
    });

    req.pipe(writeStream);
}

function sendNotFound(req, res) {
    const body = `${ req.method } URL "${ req.url }" not found on this server\n`;

    res.writeHead(404, {
        'content-type': 'text/plain',
        'content-length': Buffer.byteLength(body),
    });

    res.write(body);
    res.end();
}

function sendHtml(res, body) {
    res.writeHead(200, {
        'content-type': 'text/html',
        'content-length': Buffer.byteLength(body),
    });

    res.write(body);
    res.end();
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
