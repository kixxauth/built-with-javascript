import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import tls from 'node:tls';
import childProcesses from 'node:child_process';
import Logger from './lib/logger.js';
import { isNonEmptyString, readBufferFile, readJsonFile } from './lib/utils.js';

if (!isNonEmptyString(process.argv[2])) {
    throw new Error('Expected a config file path as commmand line argument');
}

// The "^" symbol within "[^]" means one NOT of the following set of characters.
// eslint-disable-next-line no-useless-escape
const DISALLOWED_URL_CHARACTERS = /[^a-z0-9_\.\:\-\/\&\?\=%]/i;

const CONFIG_FILEPATH = path.resolve(process.argv[2]);

const VHOSTS_BY_HOSTNAME = new Map();
const CERTNAME_BY_SERVERNAME = new Map();
const SSL_CERT_CACHE = new Map();
const SSL_KEY_CACHE = new Map();


const logger = new Logger({ name: 'EdgeServer' });

let encryptedServer;
let unencryptedServer;


async function main() {
    const config = await loadConfig(CONFIG_FILEPATH);

    VHOSTS_BY_HOSTNAME.forEach(({ command }) => {
        startSubProcess(command);
    });

    encryptedServer = startEncryptedServer(config);
    unencryptedServer = startUencryptedServer(config);
}

function getSslKeyForServername(servername) {
    const certname = CERTNAME_BY_SERVERNAME.get(servername);

    if (!certname) {
        throw new Error(`SNI servername "${ servername }" is unknown`);
    }

    const buff = SSL_KEY_CACHE.get(certname);

    if (!buff) {
        throw new Error(`Missing key for SNI servername "${ servername }" certname "${ certname }"`);
    }

    return buff;
}

function getSslCertForServername(servername) {
    const certname = CERTNAME_BY_SERVERNAME.get(servername);

    if (!certname) {
        throw new Error(`SNI servername "${ servername }" is unknown`);
    }

    const buff = SSL_CERT_CACHE.get(certname);

    if (!buff) {
        throw new Error(`Missing cert for SNI servername "${ servername }" certname "${ certname }"`);
    }

    return buff;
}

async function loadConfig(filepath) {
    const config = await readJsonFile(filepath);

    if (!isNonEmptyString(config.certDirectory)) {
        throw new Error('config.certDirectory must be a string');
    }
    if (!Number.isInteger(config.encryptedServer.port)) {
        throw new Error('config.encryptedServer.port must be an integer');
    }
    if (!Number.isInteger(config.unencryptedServer.port)) {
        throw new Error('config.unencryptedServer.port must be an integer');
    }

    for (const vhost of config.virtualHosts) {
        if (!isNonEmptyString(vhost.command)) {
            throw new Error('config.virtualHosts[].command must be a string');
        }
        if (!Number.isInteger(vhost.port)) {
            throw new Error('config.virtualHosts[].port must be an integer');
        }

        for (const hostname of vhost.hostnames) {
            if (!isNonEmptyString(hostname.hostname)) {
                throw new Error('config.virtualHosts[].hostnames[].hostname must be a string');
            }

            VHOSTS_BY_HOSTNAME.set(hostname.hostname, vhost);

            if (isNonEmptyString(hostname.certname)) {
                CERTNAME_BY_SERVERNAME.set(hostname.hostname, hostname.certname);

                const certFilepath = path.join(config.certDirectory, `${ hostname.certname }.cert`);
                const keyFilepath = path.join(config.certDirectory, `${ hostname.certname }.key`);

                const cert = await readBufferFile(certFilepath);
                const key = await readBufferFile(keyFilepath);

                SSL_CERT_CACHE.set(hostname.certname, cert);
                SSL_KEY_CACHE.set(hostname.certname, key);
            }
        }
    }

    return config;
}

function startSubProcess(command) {
    logger.log('starting sub process', { command });

    const cp = childProcesses.exec(command);

    cp.on('exit', () => {
        logger.warn('child process exited', { command });
    });

    cp.stdout.on('data', (chunk) => {
        process.stdout.write(chunk);
    });

    cp.stderr.on('data', (chunk) => {
        process.stderr.write(chunk);
    });
}

function startEncryptedServer(config) {
    const server = https.createServer({ SNICallback: sniCallback });

    // In a Server Name Indication scheme (SNI) the servername is the hostname on the request.
    function sniCallback(servername, callback) {
        logger.log('server name indication callback', { servername });

        let context;
        try {
            const cert = getSslCertForServername(servername);
            const key = getSslKeyForServername(servername);
            context = tls.createSecureContext({ cert, key });
        } catch (error) {
            logger.error('error in SNI callback', { error });
            callback(error);
        }

        if (context) {
            callback(null, context);
        }
    }

    function handleRequest(req, res) {
        const { method } = req;
        const host = req.headers.host;
        const href = `https://${ host }${ req.url }`;

        logger.log('request', { method, href });

        if (!isNonEmptyString(host)) {
            logger.log('invalid request host', { host });
            sendInvalidHostResponse(req, res);
            return;
        }

        let url;
        try {
            url = createFullUrl('https', host, req.url);
        } catch (error) {
            logger.debug('invalid request url', { url: req.url, error });
            sendInvalidUrlResponse(req, res);
            return;
        }

        const vhost = VHOSTS_BY_HOSTNAME.get(url.hostname);

        if (!vhost) {
            logger.log('host not available', { hostname: url.hostname });
            sendNotFoundHostResponse(req, res);
            return;
        }

        proxyRequest(req, res, 'https', vhost.port);
    }

    server.on('error', (error) => {
        logger.error('encrypted server error event', { error });
        closeServersAndExit();
    });

    server.on('listening', () => {
        const { port } = server.address();
        logger.log('encrypted server listening', { port });
    });

    server.on('request', handleRequest);

    server.listen(config.encryptedServer.port);

    return server;
}

function startUencryptedServer(config) {
    const server = http.createServer();

    function handleRequest(req, res) {
        const { method } = req;
        const host = req.headers.host;
        const href = `http://${ host }${ req.url }`;

        logger.log('request', { method, href });

        if (!isNonEmptyString(host)) {
            logger.log('invalid request host', { host });
            sendInvalidHostResponse(req, res);
            return;
        }

        let url;
        try {
            url = createFullUrl('http', host, req.url);
        } catch (error) {
            logger.debug('invalid request url', { url: req.url, error });
            sendInvalidUrlResponse(req, res);
            return;
        }

        const vhost = VHOSTS_BY_HOSTNAME.get(url.hostname);

        if (!vhost) {
            logger.log('host not available', { hostname: url.hostname });
            sendNotFoundHostResponse(req, res);
            return;
        }

        proxyRequest(req, res, 'http', vhost.port);
    }

    server.on('error', (error) => {
        logger.error('unencrypted server error event', { error });
        closeServersAndExit();
    });

    server.on('listening', () => {
        const { port } = server.address();
        logger.log('unencrypted server listening', { port });
    });

    server.on('request', handleRequest);

    server.listen(config.unencryptedServer.port);

    return server;
}

function createFullUrl(protocol, host, pathname) {
    decodeURIComponent(pathname);

    if (DISALLOWED_URL_CHARACTERS.test(pathname)) {
        throw new TypeError('Disallowed characters in request URL');
    }

    // Parse the URL.
    return new URL(pathname, `${ protocol }://${ host }`);
}

function proxyRequest(req, res, protocol, port) {

    const headers = Object.assign({}, req.headers);

    headers['x-forwarded-host'] = headers.host;
    headers['x-forwarded-proto'] = protocol;

    const options = {
        method: req.method,
        port,
        path: req.url,
        headers,
    };

    req.once('error', (error) => {
        logger.error('edge request error event', { error });
    });

    res.once('error', (error) => {
        logger.error('edge response error event', { error });
    });

    const request = http.request(options, (response) => {
        response.once('error', (error) => {
            logger.error('proxy response error event', { error });
            if (!res.headersSent) {
                sendBadGateway(req, res);
            }
        });

        res.writeHead(response.statusCode, response.statusMessage, response.headers);

        response.pipe(res);
    });

    request.once('error', (error) => {
        logger.error('proxy request error event', { error });
        if (!res.headersSent) {
            sendGatewayTimeout(req, res);
        }
    });

    req.pipe(request);
}

function sendInvalidHostResponse(req, res) {
    const body = 'Bad Request: Invalid host request header\n';

    res.writeHead(400, 'Bad Request', {
        'content-type': 'text/plain; charset=UTF-8',
        'content-length': Buffer.byteLength(body),
    });

    res.end(body);
}

function sendInvalidUrlResponse(req, res) {
    const body = 'Bad Request: Invalid URL\n';

    res.writeHead(400, 'Bad Request', {
        'content-type': 'text/plain; charset=UTF-8',
        'content-length': Buffer.byteLength(body),
    });

    res.end(body);
}

function sendNotFoundHostResponse(req, res) {
    const body = 'Not Found: Host not found\n';

    res.writeHead(404, 'Not Found', {
        'content-type': 'text/plain; charset=UTF-8',
        'content-length': Buffer.byteLength(body),
    });

    res.end(body);
}

function sendGatewayTimeout(req, res) {
    const body = 'No response from origin server\n';

    res.writeHead(504, 'Gateway Timeout', {
        'content-type': 'text/plain; charset=UTF-8',
        'content-length': Buffer.byteLength(body),
    });

    res.end(body);
}

function sendBadGateway(req, res) {
    const body = 'Error from origin server\n';

    res.writeHead(502, 'Bad Gateway', {
        'content-type': 'text/plain; charset=UTF-8',
        'content-length': Buffer.byteLength(body),
    });

    res.end(body);
}

function closeServersAndExit() {
    logger.log('closing servers and exiting');

    const closed = Promise.all([
        closeServer(encryptedServer),
        closeServer(unencryptedServer),
    ]);

    closed.finally(() => {
        process.exit(1);
    });
}

function closeServer(server) {
    return new Promise((resolve, reject) => {

        server.on('error', (error) => {
            reject(error);
        });

        server.on('close', () => {
            // Allow some time for the server to shut down.
            setTimeout(() => {
                resolve(true);
            }, 100);
        });

        server.close(() => {
            server.closeAllConnections();
        });
    });
}

main().catch((error) => {
    console.log('Error starting servers:');// eslint-disable-line no-console
    console.log(error);// eslint-disable-line no-console
});
