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

    function proxyRequest(req, res, url, port) {
        const { method } = req;
        const { href } = url;
        const proto = url.protocol.replace(/:$/, '');
        const headers = Object.assign({}, req.headers);

        // Use the finish event to log out the response.
        // Need to use res.setHeader() instead of res.writeHead(statusCod, statusMessage, headers)
        // in order to be able to capture the headers here with res.getHeaders().
        res.on('finish', () => {
            const responseHeaders = res.getHeaders();
            const contentType = responseHeaders['content-type'];
            const contentLength = parseInt(responseHeaders['content-length'], 10);
            const statusCode = res.statusCode;
            logger.info('response finish', { method, href, statusCode, contentType, contentLength });
        });

        headers['x-forwarded-host'] = headers.host;
        headers['x-forwarded-proto'] = proto;

        const options = {
            method,
            port,
            path: req.url,
            headers,
        };

        req.once('error', (error) => {
            // TODO: Handle errors when the client aborts:
            // { "error":{"name":"Error","code":"ECONNRESET","message":"aborted"}}
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

            // Use res.setHeader() so we can log out headers on the finish event.
            Object.keys(response.headers).forEach((key) => {
                res.setHeader(key, response.headers[key]);
            });

            res.writeHead(response.statusCode, response.statusMessage);

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

        proxyRequest(req, res, url, vhost.port);
    };
}
