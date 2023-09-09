import https from 'node:https';
import { signRequest } from './sign-aws-request.js';


const AWS_ACCESS_KEY_ID = process.argv[2];
const AWS_SECRET_KEY = process.argv[3];


async function makeAwsRequest() {
    const region = 'us-east-2';
    const service = 'mediaconvert';
    const serviceVersion = '2017-08-29';

    const method = 'POST';
    const url = new URL(`https://${ service }.${ region }.amazonaws.com/${ serviceVersion }/endpoints`);
    const body = '';

    const awsOptions = {
        accessKey: AWS_ACCESS_KEY_ID,
        secretKey: AWS_SECRET_KEY,
        region,
        service,
    };

    const requestOptions = {
        method,
        url,
    };

    const headers = signRequest(awsOptions, requestOptions, body);

    const options = {
        method,
        headers: headersToPlainObject(headers),
    };

    const result = await makeHttpsRequest(url, options, body);

    console.log(JSON.stringify(result, null, 2));
}

function makeHttpsRequest(url, options, body) {
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

function headersToPlainObject(headers) {
    const obj = {};

    for (const [ key, val ] of headers.entries()) {
        obj[key] = val;
    }

    return obj;
}

makeAwsRequest().catch((error) => {
    /* eslint-disable no-console */
    console.error('Caught Error:');
    console.error(error);
    /* eslint-enable no-console */
});
