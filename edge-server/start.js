import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import tls from 'node:tls';
import childProcesses from 'node:child_process';
import Logger from './lib/logger.js';
import { createHttpRequestHandler } from './lib/http-request-handler.js';
import { isNonEmptyString, readBufferFile, readJsonFile } from './lib/utils.js';

if (!isNonEmptyString(process.argv[2])) {
    throw new Error('Expected a config file path as commmand line argument');
}

const CONFIG_FILEPATH = path.resolve(process.argv[2]);

// Allowed restarts for a sub process before no further restarts will be attempted.
const SUBPROCESS_RESTART_LIMIT = 5;
// Amount of time before a sub process is considered mature and can be restarted.
const SUBPROCESS_MATURITY_MS = 15 * 1000;

const VHOSTS_BY_HOSTNAME = new Map();
const CERTNAME_BY_SERVERNAME = new Map();
const SSL_CA_CACHE = new Map();
const SSL_CERT_CACHE = new Map();
const SSL_KEY_CACHE = new Map();


const logger = new Logger({ name: 'EdgeServer' });

const servers = [];
const subProcesses = [];
const openSockets = new Set();

let destroyed = false;


async function main() {
    const config = await loadConfig(CONFIG_FILEPATH);

    config.virtualHosts.forEach(({ command }) => {
        subProcesses.push(startSubProcess(command));
    });

    servers.push(startEncryptedServer(config));
    servers.push(startUnencryptedServer(config));

    // Track open socket connections so we can close the server when needed.
    servers.forEach((server) => {
        server.on('connection', (socket) => {
            openSockets.add(socket);

            socket.on('close', () => {
                openSockets.delete(socket);
            });
        });
    });
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

function getSslCaForServername(servername) {
    const certname = CERTNAME_BY_SERVERNAME.get(servername);

    if (!certname) {
        throw new Error(`SNI servername "${ servername }" is unknown`);
    }

    return SSL_CA_CACHE.get(certname);
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

                const caFilepath = path.join(config.certDirectory, `${ hostname.certname }.ca`);
                const certFilepath = path.join(config.certDirectory, `${ hostname.certname }.cert`);
                const keyFilepath = path.join(config.certDirectory, `${ hostname.certname }.key`);

                const ca = await readBufferFile(caFilepath);
                const cert = await readBufferFile(certFilepath);
                const key = await readBufferFile(keyFilepath);

                logger.log('loaded ssl certificate', {
                    hostname: hostname.hostname,
                    certname: hostname.certname,
                    ca: Boolean(ca),
                    cert: Boolean(cert),
                    key: Boolean(key),
                });

                SSL_CA_CACHE.set(hostname.certname, ca);
                SSL_CERT_CACHE.set(hostname.certname, cert);
                SSL_KEY_CACHE.set(hostname.certname, key);
            }
        }
    }

    return config;
}

function startSubProcess(command, restartCount = 0) {
    logger.log('starting child process', { command });

    const maturityTime = Date.now() + SUBPROCESS_MATURITY_MS;
    const cp = childProcesses.exec(command, { detached: true });

    cp.on('spawn', () => {
        logger.log('child process spawned', { command });
    });

    cp.on('exit', (exitCode = null, signal = null) => {
        logger.warn('child process exited', { exitCode, signal, command });

        if (signal === null) {
            if (Date.now() > maturityTime) {
                restartCount += 1;
                if (restartCount <= SUBPROCESS_RESTART_LIMIT) {
                    logger.log('will restart child process', { command });
                    startSubProcess(command, restartCount);
                } else {
                    // Need to limit the number of allowed restarts to avoid infinite recursion.
                    logger.log(
                        'will not restart child process; reached restart limit',
                        { command, limit: SUBPROCESS_RESTART_LIMIT }
                    );
                }
            } else {
                // Need to limit the number of allowed restarts to avoid infinite recursion.
                logger.log(
                    'will not restart child process; process did not reach maturity',
                    { command, maturityThreshold: SUBPROCESS_MATURITY_MS }
                );
            }
        } else if (destroyed) {
            logger.log(
                'will not restart child process; parent process destroyed',
                { command, signal, exitCode }
            );
        } else {
            logger.log(
                'will not restart child process; killed with signal',
                { command, signal, exitCode }
            );
        }
    });

    // Pipe child process stdout and stderr to this process stdout and stderr.

    cp.stdout.on('data', (chunk) => {
        process.stdout.write(chunk);
    });

    cp.stderr.on('data', (chunk) => {
        process.stderr.write(chunk);
    });

    return cp;
}

function startEncryptedServer(config) {
    const server = https.createServer({ SNICallback: sniCallback });

    const handleRequest = createHttpRequestHandler({
        logger,
        protocol: 'https',
        vhostsByHostname: VHOSTS_BY_HOSTNAME,
    });

    // In a Server Name Indication scheme (SNI) the servername is the hostname on the request.
    function sniCallback(servername, callback) {
        logger.log('server name indication callback', { servername });

        // Uncomment for testing.
        // An Error here, without using the provided callback, will crash the server.
        // throw new Error('Test SNI Error');

        // Uncomment for testing.
        // It is possible to exit the process from here. The following call will succeed:
        // closeServersAndExit();

        let context;
        try {
            const ca = getSslCaForServername(servername);
            const cert = getSslCertForServername(servername);
            const key = getSslKeyForServername(servername);

            if (ca) {
                context = tls.createSecureContext({ ca, cert, key });
            } else {
                context = tls.createSecureContext({ cert, key });
            }
        } catch (error) {
            logger.error('error in SNI callback', { error });
            callback(error);
        }

        if (context) {
            callback(null, context);
        }
    }

    server.once('error', (error) => {
        logger.error('encrypted server error event', { error });
        closeServersAndExit();
    });

    server.once('listening', () => {
        const { port } = server.address();
        logger.log('encrypted server listening', { port });
    });

    server.on('request', handleRequest);

    server.listen(config.encryptedServer.port);

    return server;
}

function startUnencryptedServer(config) {
    const server = http.createServer();

    const handleRequest = createHttpRequestHandler({
        logger,
        protocol: 'http',
        vhostsByHostname: VHOSTS_BY_HOSTNAME,
    });

    server.once('error', (error) => {
        logger.error('unencrypted server error event', { error });
        closeServersAndExit();
    });

    server.once('listening', () => {
        const { port } = server.address();
        logger.log('unencrypted server listening', { port });
    });

    server.on('request', handleRequest);

    server.listen(config.unencryptedServer.port);

    return server;
}

function closeServersAndExit() {
    logger.log('closing servers and exiting');

    // Set the `destroyed` flag to prevent any other processes or operations from starting.
    destroyed = true;

    servers.forEach((server) => {
        server.close();
        server.closeAllConnections();
    });

    for (const proc of subProcesses) {
        proc.kill();
    }

    // Even though we call .closeAllConnections() on the servers, we still need to
    // destroy open sockets. This seems contrary to expectations, but have not
    // dug into the details of why it is required.
    for (const socket of openSockets.values()) {
        socket.destroy();
    }

    // If everything is shut down and destroyed properly, we should
    // not need to call process.exit().
    // process.exit(1);
}

process.on('uncaughtException', (error, origin) => {
    logger.error('uncaught exception', { origin, error });
    closeServersAndExit();
});

main().catch((error) => {
    console.log('Error starting servers:');// eslint-disable-line no-console
    console.log(error);// eslint-disable-line no-console
});
