import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';


const PORT = 8001;
const FILEPATH = fromFileUrl(new URL(import.meta.url));
const ROOTDIR = path.dirname(FILEPATH);


function printErrorAndExit(message, error) {
    console.error('TestServer error', message, error);

    // Allow time for the error message to print before exiting.
    setTimeout(() => {
        process.exit(1);
    }, 200);
}

const server = http.createServer((req, res) => {
    const ip = req.socket.remoteAddress;
    console.log('TestServer request', ip, req.method, req.url);

    req.on('error', (error) => {
        printErrorAndExit('request error event', error);
    });

    res.on('error', (error) => {
        printErrorAndExit('response error event', error);
    });

    switch (req.url) {
        case '/':
            handleWebPage(req, res);
            break;
        case '/file':
            handleFileUpload(req, res);
            break;
        case '/trigger-error':
            handleTriggerError(req, res);
            break;
        default:
            sendNotFound(req, res);
            break;
    }
});

function handleWebPage(req, res) {
    if (req.method !== 'GET') {
        sendMethodNotAllowed(req, res, [ 'GET' ]);
    } else {
        const filepath = path.join(ROOTDIR, 'index.html');

        fs.readFile(filepath, { encoding: 'utf8' }, (error, htmlString) => {
            if (error) {
                throw error;
            }

            res.writeHead(200, 'OK', {
                'content-type': 'text/html',
                'content-length': Buffer.byteLength(htmlString),
            });

            res.end(htmlString);
        });
    }
}

function handleFileUpload(req, res) {
    if (req.method !== 'PUT') {
        sendMethodNotAllowed(req, res, [ 'PUT' ]);
    } else {
        const destStream = fs.createWriteStream(path.join(os.tmpdir(), 'temporary-file-upload'));

        // The "finish" event is not fired on an IncomingMessage instance (req).
        // req.on('finish', () => {
        //     console.log('EVENT FINISH');
        // });

        req.on('close', () => {
            console.log('TestServer file saved');
            res.writeHead(201, 'Created');
            res.end();
        });

        req.pipe(destStream);
    }
}

function handleTriggerError() {
    setTimeout(() => {
        console.log('TestServer throw error');
        throw new Error('Async fatal test error');
    }, 500);
}

function sendNotFound(req, res) {
    const body = `No resource found at ${ req.url }.\n`;

    console.log('TestServer send not found response');

    res.writeHead(404, 'Not Found', {
        'content-type': 'text/plain',
        'content-length': Buffer.byteLength(body),
    });

    res.end(body);
}

function sendMethodNotAllowed(req, res, allowed) {
    allowed = allowed.join(', ');

    const body = `Method ${ req.method } not allowed. Allowed methods are ${ allowed }.\n`;

    res.writeHead(405, 'Method Not Allowed', {
        allowed,
        'content-type': 'text/plain',
        'content-length': Buffer.byteLength(body),
    });

    res.end(body);
}

function fromFileUrl(url) {
    return decodeURIComponent(
        url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, '%25')
    );
}

server.on('error', (error) => {
    printErrorAndExit('server error event', error);
});

server.on('listening', () => {
    const { port } = server.address();
    console.log(`TestServer running at http://localhost:${ port }`);
});

server.listen(PORT);
