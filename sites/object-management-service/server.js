import http from 'node:http';


const PORT = 3003;


function printErrorAndExit(message, error) {
    /* eslint-disable no-console */
    console.error(message);
    console.error(error);
    process.exit(1);
    /* eslint-enable no-console */
}


const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${ PORT }`);

    // eslint-disable-next-line no-console
    console.log(req.method, url.pathname);

    const chunks = [];

    req.on('error', (error) => {
        printErrorAndExit('request error event', error);
    });

    req.on('data', (chunk) => {
        chunks.push(chunk);
    });

    req.on('end', () => {
        const utf8 = Buffer.concat(chunks).toString('utf8');
        const json = JSON.parse(utf8);

        const responseData = JSON.stringify({
            jsonrpc: '2.0',
            id: json.id,
            result: { scopeId: json.params.scopeId, tokens: [] },
        });

        res.writeHead(200, {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(responseData),
        });

        res.write(responseData);
        res.end();
    });
});

server.on('error', (error) => {
    printErrorAndExit('server error event', error);
});

server.on('listening', () => {
    // eslint-disable-next-line no-console
    console.log(`server running at http://localhost:${ PORT }`);
});

server.listen(PORT);
