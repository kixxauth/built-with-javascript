import http from 'node:http';

const args = process.argv.slice(2);

const server = http.createServer((req, res) => {
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
