import https from 'node:https';
import { signRequest, headersToPlainObject } from './sign-aws-request.js';


export default class MediaConvertClient {

    #awsAccessKeyId = '';
    #awsSecretKey = '';
    #region = 'us-east-2';
    #service = 'mediaconvert';
    #serviceVersion = '2017-08-29';
    #endpoint = null;

    constructor(options) {
        this.#awsAccessKeyId = options.awsAccessKeyId;
        this.#awsSecretKey = options.awsSecretKey;
    }

    async getJob(id) {
        const pathname = `/${ this.#serviceVersion }/jobs/${ id }`;
        const result = await this.#makeRequest('GET', pathname, '');
        return result.json.job;
    }

    async #makeRequest(method, pathname, body) {
        if (!this.#endpoint) {
            await this.#getEndpoint();
        }

        const url = new URL(pathname, this.#endpoint.url);

        const awsOptions = {
            accessKey: this.#awsAccessKeyId,
            secretKey: this.#awsSecretKey,
            region: this.#region,
            service: this.#service,
        };

        const requestOptions = { method, url };

        const headers = signRequest(awsOptions, requestOptions, body);

        const options = {
            method,
            headers: headersToPlainObject(headers),
        };

        const result = await this.#makeHttpsRequest(url, options, body);

        return result;
    }

    async #getEndpoint() {
        const region = this.#region;
        const service = this.#service;
        const serviceVersion = this.#serviceVersion;

        const method = 'POST';
        const url = new URL(`https://${ service }.${ region }.amazonaws.com/${ serviceVersion }/endpoints`);
        const body = '';

        const awsOptions = {
            accessKey: this.#awsAccessKeyId,
            secretKey: this.#awsSecretKey,
            region,
            service,
        };

        const requestOptions = { method, url };

        const headers = signRequest(awsOptions, requestOptions, body);

        const options = {
            method,
            headers: headersToPlainObject(headers),
        };

        const result = await this.#makeHttpsRequest(url, options, body);

        this.#endpoint = result.json.endpoints[0];
    }

    #makeHttpsRequest(url, options, body) {
        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                const chunks = [];

                res.once('error', reject);

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    req.off('error', reject);
                    res.off('error', reject);

                    const utf8 = Buffer.concat(chunks).toString('utf8');

                    let json;
                    try {
                        json = JSON.parse(utf8);
                    } catch (e) {
                        resolve({
                            stausCode: res.statusCode,
                            headers: res.headers,
                            utf8,
                        });

                        return;
                    }

                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        json,
                    });
                });
            });

            req.once('error', reject);

            if (typeof body === 'string' || body) {
                req.write(body);
            }

            req.end();
        });
    }
}

// TODO: Remove this!
const client = new MediaConvertClient({
});

client.getJob('1693230862997-36szjw').then((job) => {
    console.log(job);
}).catch((error) => {
    console.error('Caught error:');
    console.error(error);
});
