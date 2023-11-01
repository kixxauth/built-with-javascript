import http from 'node:http';

const server = http.createServer(() => {
    throw new Error('Expected uncaught error');
});

server.listen(8001);
