import { signRequest } from './sign-aws-request.js';
import { makeHttpsRequest, headersToPlainObject } from './make-aws-request.js';


const AWS_ACCESS_KEY_ID = process.argv[2];
const AWS_SECRET_KEY = process.argv[3];


async function getMediaConvertEndpoints() {
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

    console.log(result.json); // eslint-disable-line no-console
}

getMediaConvertEndpoints().catch((error) => {
    /* eslint-disable no-console */
    console.error('Caught Error:');
    console.error(error);
    /* eslint-enable no-console */
});
