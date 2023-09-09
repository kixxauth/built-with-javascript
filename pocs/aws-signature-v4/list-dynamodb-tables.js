import { signRequest } from './sign-aws-request.js';
import { makeHttpsRequest, headersToPlainObject } from './make-aws-request.js';


const AWS_ACCESS_KEY_ID = process.argv[2];
const AWS_SECRET_KEY = process.argv[3];


async function listDynamoDBTables() {
    const region = 'us-east-2';
    const service = 'dynamodb';
    const serviceVersion = 'DynamoDB_20120810';

    const method = 'POST';
    const url = new URL(`https://${ service }.${ region }.amazonaws.com/`);
    const headers = new Headers();
    const body = '{}';

    headers.set('content-type', 'application/x-amz-json-1.0');
    headers.set('content-length', Buffer.byteLength(body));
    headers.set('x-amz-target', `${ serviceVersion }.ListTables`);

    const awsOptions = {
        accessKey: AWS_ACCESS_KEY_ID,
        secretKey: AWS_SECRET_KEY,
        region,
        service,
    };

    const requestOptions = {
        method,
        headers,
        url,
    };

    const signedHeaders = signRequest(awsOptions, requestOptions, body);

    const options = {
        method,
        headers: headersToPlainObject(signedHeaders),
    };

    const result = await makeHttpsRequest(url, options, body);

    console.log(result); // eslint-disable-line no-console
}

listDynamoDBTables().catch((error) => {
    /* eslint-disable no-console */
    console.error('Caught Error:');
    console.error(error);
    /* eslint-enable no-console */
});
