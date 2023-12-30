/* eslint-disable no-console */
import http from 'node:http';

let requestCount = 0;

const server = http.createServer((req, res) => {

    req.on('error', (error) => {
        console.log('request error event', error);
    });

    res.on('error', (error) => {
        console.log('response error event', error);
    });

    setTimeout(() => {
        const body = 'Hello world\n';

        res.writeHead(200, {
            'content-type': 'text/plain',
            'content-length': Buffer.byteLength(body),
        });

        res.end(body);
    }, 5000);

    if (requestCount >= 2) {
        console.log('attempt to kill server');

        // This will succeed in killing the server, but will close the
        // connections to the clients.
        // process.exit(1);

        // This will also succeed in killing the server, but will close the
        // connections to the clients and emit ECONNRESET error on any open requests.
        server.closeAllConnections();
        server.close();
    }

    requestCount += 1;
});

server.on('error', (error) => {
    console.log('server error event', error);
});

server.on('listening', () => {
    const { port } = server.address();
    console.log(`server running at http://localhost:${ port }`);
});

server.listen(8000);
