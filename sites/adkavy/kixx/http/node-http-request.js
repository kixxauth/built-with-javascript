import { JSONParsingError } from '../errors/mod.js';
import { objectToHeaders } from './http-utils.js';


export default class NodeHTTPRequest {

    pathnameParams = {};
    #nodeRequest = null;

    constructor(spec) {

        this.#nodeRequest = spec.req;

        const headers = objectToHeaders(this.#nodeRequest.headers);

        Object.defineProperties(this, {
            requestId: {
                enumerable: true,
                writable: false,
                value: spec.requestId,
            },
            headers: {
                enumerable: true,
                writable: false,
                value: headers,
            },
            url: {
                enumerable: true,
                writable: false,
                value: spec.url,
            },
        });
    }

    get method() {
        return this.#nodeRequest.method;
    }

    getReadStream() {
        return this.#nodeRequest;
    }

    setPathnameParams(value) {
        Object.defineProperty(this, 'pathnameParams', {
            enumerable: true,
            value,
        });
    }

    json() {
        return new Promise((resolve, reject) => {
            const req = this.#nodeRequest;

            const chunks = [];

            req.once('error', reject);

            req.on('data', (chunk) => {
                chunks.push(chunk);
            });

            req.on('end', () => {
                req.off('error', reject);

                const utf8 = Buffer.concat(chunks).toString('utf8');

                let json;

                try {
                    json = JSON.parse(utf8);
                } catch (cause) {
                    reject(new JSONParsingError(`Error parsing HTTP JSON body: ${ cause.message }`, { cause }));
                }

                resolve(json);
            });
        });
    }
}
