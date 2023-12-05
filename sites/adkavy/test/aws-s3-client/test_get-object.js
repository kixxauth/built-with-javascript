import sinon from 'sinon';
import AwsS3Client from '../../lib/aws-s3-client/mod.js';
import { KixxAssert } from '../../dependencies.js';
import { FakeLoggerWrapper } from '../testing-utils.js';

const { assert, assertEqual, isNonEmptyString } = KixxAssert;


export default async function test_getObject() {

    const s3Region = 'wakanda-2';
    const s3AccessKey = 'the-key-to-life';
    const s3SecretKey = 'stay-on-the-bus';
    const s3StorageClass = 'STANDARD';
    const s3Bucket = 'helsinki';
    const key = '/bus/route.json';
    const contentType = 'application/json';
    const expectedURL = new URL(`https://helsinki.s3.wakanda-2.amazonaws.com${ key }`);
    const expectedEtag = 'blahblahblah';
    const emptyDataHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';


    async function getObject() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const client = new AwsS3Client({
            logger: fakeLoggerWrapper,
            s3Region,
            s3AccessKey,
            s3SecretKey,
            s3StorageClass,
            s3Bucket,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'info');

        const now = new Date();

        const serverResponse = {
            statusCode: 200,
            headers: {
                'last-modified': now.toUTCString(),
                'content-type': contentType,
                etag: `"${ expectedEtag }"`,
            },
        };

        const serverResponseBuffer = {};

        sandbox.stub(client, 'makeHttpRequest').returns(Promise.resolve(serverResponse));
        sandbox.stub(client, 'bufferResponseData').returns(Promise.resolve(serverResponseBuffer));

        const [ metadata, buff ] = await client.getObject(key);

        assertEqual(expectedEtag, metadata.etag);
        assertEqual(contentType, metadata.contentType);
        assertEqual(serverResponseBuffer, buff);

        assertEqual(1, client.makeHttpRequest.callCount);
        assertEqual(1, client.bufferResponseData.callCount);

        const [ url, data, options ] = client.makeHttpRequest.firstCall.args;

        assertEqual(expectedURL.href, url.href);
        assertEqual(null, data);
        assertEqual('GET', options.method);
        assertEqual(expectedURL.host, options.headers.host);
        assertEqual(emptyDataHash, options.headers['x-amz-content-sha256']);
        assert(isNonEmptyString(options.headers['x-amz-date']));
        assert(isNonEmptyString(options.headers.authorization));

        sandbox.restore();
    }

    await getObject();
}
