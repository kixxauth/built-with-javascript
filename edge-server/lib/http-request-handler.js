import http from 'node:http';
import { isNonEmptyString } from './utils.js';

// The "^" symbol within "[^]" means one NOT of the following set of characters.
// eslint-disable-next-line no-useless-escape
const DISALLOWED_URL_CHARACTERS = /[^a-z0-9_\.\:\-\/\&\?\=%]/i;
// eslint-disable-next-line no-useless-escape
const DISALLOWED_HOST_CHARACTERS = /[^a-z0-9_\.\:\-]/i;

export function createHttpRequestHandler(deps) {
    const {
        logger,
        vhostsByHostname,
        protocol,
    } = deps;

    function createFullUrl(proto, host, pathname) {
        decodeURIComponent(host);
        decodeURIComponent(pathname);

        if (DISALLOWED_HOST_CHARACTERS.test(host)) {
            throw new TypeError('Disallowed characters in hostname');
        }
        if (DISALLOWED_URL_CHARACTERS.test(pathname)) {
            throw new TypeError('Disallowed characters in request URL');
        }

        // Parse the URL.
        return new URL(pathname, `${ proto }://${ host }`);
    }

    function sendInvalidHostResponse(req, res) {
        const body = 'Bad Request: Invalid host request header\n';
        setErrorResponseHeaders(res, body);
        res.writeHead(400, 'Bad Request');
        res.end(body);
    }

    function sendInvalidUrlResponse(req, res) {
        const body = 'Bad Request: Invalid URL\n';
        setErrorResponseHeaders(res, body);
        res.writeHead(400, 'Bad Request');
        res.end(body);
    }

    function sendNotFoundHostResponse(req, res) {
        const body = 'Not Found: Host not found\n';
        setErrorResponseHeaders(res, body);
        res.writeHead(404, 'Not Found');
        res.end(body);
    }

    function sendGatewayTimeout(req, res) {
        const body = 'No response from origin server\n';
        setErrorResponseHeaders(res, body);
        res.writeHead(504, 'Gateway Timeout');
        res.end(body);
    }

    function sendBadGateway(req, res) {
        const body = 'Error from origin server\n';
        setErrorResponseHeaders(res, body);
        res.writeHead(502, 'Bad Gateway');
        res.end(body);
    }

    function setErrorResponseHeaders(res, body) {
        res.setHeader('content-type', 'text/plain; charset=UTF-8');
        res.setHeader('content-length', Buffer.byteLength(body));
    }

    function proxyEdgeRequest(req, res, url, port) {
        const { method } = req;
        const { href } = url;
        const proto = url.protocol.replace(/:$/, '');
        const headers = Object.assign({}, req.headers);

        function logRequestFinish() {
            const responseHeaders = res.getHeaders();
            const contentType = responseHeaders['content-type'];
            const contentLength = parseInt(responseHeaders['content-length'], 10);
            const statusCode = res.statusCode;
            logger.info('response finish', { method, href, statusCode, contentType, contentLength });
        }

        // Use the finish event to log out the response.
        // Need to use res.setHeader() instead of res.writeHead(statusCod, statusMessage, headers)
        // in order to be able to capture the headers here with res.getHeaders().
        res.on('finish', logRequestFinish);

        headers['x-forwarded-host'] = headers.host;
        headers['x-forwarded-proto'] = proto;

        const options = {
            method,
            port,
            path: req.url,
            headers,
        };

        let proxyResponse;

        const proxyRequest = http.request(options, (response) => {
            proxyResponse = response;

            // How would this ever happen? Not really sure; so we can't be sure we're
            // handling it correctly here until we detect it.
            proxyResponse.once('error', (error) => {
                logger.error('proxy response error event', { error });
                if (!res.headersSent) {
                    sendBadGateway(req, res);
                }
            });

            // Use res.setHeader() so we can log out headers on the finish event.
            Object.keys(proxyResponse.headers).forEach((key) => {
                res.setHeader(key, proxyResponse.headers[key]);
            });

            res.writeHead(proxyResponse.statusCode, proxyResponse.statusMessage);

            proxyResponse.pipe(res);
        });

        // You can trigger this error for debugging by making a long request to
        // the edge server, then aborting it (with ctrl-c).
        req.once('error', (error) => {
            logger.warn('edge request error event', { error });

            // Immediately abort both the proxy request and client request.
            req.destroy();
            res.destroy();
            proxyRequest.destroy();

            if (proxyResponse) {
                proxyResponse.destroy();
            }
        });

        // How would this ever happen? Not really sure; so we can't be sure we're
        // handling it correctly here until we detect it.
        res.once('error', (error) => {
            logger.error('edge response error event', { error });

            // Immediately abort both the proxy request and client request.
            req.destroy();
            res.destroy();
            proxyRequest.destroy();

            if (proxyResponse) {
                proxyResponse.destroy();
            }
        });

        // You can trigger this error for debugging by attempting to make a request to a server
        // port which does not exist (via the config file).
        proxyRequest.once('error', (error) => {
            logger.warn('proxy request error event', { error });

            // Immediately abort the proxy request.
            req.unpipe(proxyRequest);
            proxyRequest.destroy();

            if (!res.headersSent) {
                sendGatewayTimeout(req, res);
            }

            // Destroy the connection to hard fail.
            // The message above will be sent, but then the client connection will hard fail.
            // This could be wrapped in a timeout() to execute in the next turn of the
            // event loop, but I don't think we want to do that. If we get bombarded with
            // requests which cause proxy request errors then we probably want to abort them
            // and release resources without waiting for a new turn in the event loop.
            req.destroy();

            // Destroy the response streams as well.
            res.destroy();

            if (proxyResponse) {
                proxyResponse.destroy();
            }
        });

        req.pipe(proxyRequest);
    }

    return function httpRequestHandler(req, res) {
        const { method, socket } = req;
        const ip = socket.remoteAddress;
        const host = req.headers.host;
        const href = `${ protocol }://${ host }${ req.url }`;

        if (!isNonEmptyString(host)) {
            logger.debug('invalid or missing request host header', { ip });
            sendInvalidHostResponse(req, res);
            return;
        }

        let url;
        try {
            url = createFullUrl(protocol, host, req.url);
        } catch (error) {
            logger.debug('invalid request url', { ip, errorMessage: error.message });
            sendInvalidUrlResponse(req, res);
            return;
        }

        const vhost = vhostsByHostname.get(url.hostname);

        if (!vhost) {
            logger.debug('host does not exist', { ip, hostname: url.hostname });
            sendNotFoundHostResponse(req, res);
            return;
        }

        logger.log('request', { ip, method, href });

        proxyEdgeRequest(req, res, url, vhost.port);
    };
}
