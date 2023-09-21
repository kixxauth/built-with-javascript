export default class HTTPRequest {

    #nodeRequest = null;

    constructor(spec) {
        this.#nodeRequest = spec.req;
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
                } catch (err) {
                    // TODO: Throw a JsonParsingError to be more explicit.
                    reject(err);
                }

                resolve(json);
            });
        });
    }
}
