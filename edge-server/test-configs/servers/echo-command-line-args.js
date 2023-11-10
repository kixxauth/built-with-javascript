import http from 'node:http';

const args = process.argv.slice(2);

const server = http.createServer((req, res) => {
    // Ensure logging will work:

    // eslint-disable-next-line no-console
    console.log('STDOUT argv', args.join());
    // eslint-disable-next-line no-console
    console.log('STDERR argv', args.join());

    const responseData = {
        args,
        method: req.method,
        url: req.url,
        headers: req.headers,
    };

    const body = JSON.stringify(responseData, null, 4) + '\n';

    res.writeHead(200, 'OK', {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
    });

    res.end(body);
});

server.listen(8001);
