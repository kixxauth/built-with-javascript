import HTTPRequest from './http-request.js';


export default class HTTPRequestTarget {

    #routingTable = null;

    constructor(spec) {
        this.#routingTable = spec.routingTable;
    }

    async handleRequest(req, res) {
        // TODO: Dynamically get protocol, host, and port from configuration.
        const url = new URL(req.url, `http://localhost:3003`);

        // eslint-disable-next-line no-console
        console.log(req.method, url.pathname);

        const request = new HTTPRequest({ req, url });

        const response = await this.#routingTable.routeRequest(request);

        const { status, statusText, body } = response;

        const headers = headersToObject(response.headers);

        res.writeHead(status, statusText, headers);

        // TODO: Handle streams as HTTP response
        // if (isFunction(body.pipe)) {
        //     body.pipe(res);
        // }

        res.write(body);
        res.end();
    }
}

function headersToObject(headers) {
    if (headers instanceof Headers) {
        const obj = {};

        for (const [ key, val ] of headers.entries()) {
            obj[key] = val;
        }

        return obj;
    }

    return headers;
}
