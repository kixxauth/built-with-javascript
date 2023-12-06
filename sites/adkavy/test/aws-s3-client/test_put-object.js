import sinon from 'sinon';
import AwsS3Client from '../../lib/aws-s3-client/mod.js';
import { KixxAssert } from '../../dependencies.js';
import { FakeLoggerWrapper } from '../testing-utils.js';

const { assert, assertEqual, isNonEmptyString } = KixxAssert;


export default async function test_getObject() {

    const s3Region = 'wakanda-2';
    const s3AccessKey = 'the-key-to-life';
    const s3SecretKey = 'stay-on-the-bus';
    const s3StorageClass = 'NON-STANDARD';
    const s3Bucket = 'helsinki';
    const key = '/bus/route.json';
    const contentType = 'application/json';
    const expectedURL = new URL(`https://helsinki.s3.wakanda-2.amazonaws.com${ key }`);
    const expectedEtag = '035b92f46843244cb12c7a793ff90806';


    async function putObject() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const client = new AwsS3Client({
            logger: fakeLoggerWrapper,
            s3Region,
            s3AccessKey,
            s3SecretKey,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'info');

        const serverResponse = {
            statusCode: 200,
            headers: {
                etag: `"${ expectedEtag }"`,
                'x-amz-storage-class': s3StorageClass,
            },
        };

        const serverResponseBuffer = {};

        sandbox.stub(client, 'makeHttpRequest').returns(Promise.resolve(serverResponse));
        sandbox.stub(client, 'bufferResponseData').returns(Promise.resolve(serverResponseBuffer));

        const putOptions = {
            s3Bucket,
            s3StorageClass,
            contentType,
        };

        const jsonString = JSON.stringify({
            foo: 'bar',
            bar: 'baz',
            baz: [ 'foo', 'bar' ],
        });

        const objectBuff = Buffer.from(jsonString);

        const metadata = await client.putObject(putOptions, key, objectBuff);

        assertEqual(1, client.makeHttpRequest.callCount);
        assertEqual(0, client.bufferResponseData.callCount);

        const [ url, data, options ] = client.makeHttpRequest.firstCall.args;

        assertEqual(expectedURL.href, url.href);
        assertEqual(objectBuff, data);
        assertEqual('PUT', options.method);
        assertEqual(expectedURL.host, options.headers.host);

        assertEqual(
            'fb7123568c7a2dea33f6977f88346a38984e000fb8f1cc7795944f0d1d4e0bd0',
            options.headers['x-amz-content-sha256']
        );

        assert(isNonEmptyString(options.headers['x-amz-date']));
        assert(isNonEmptyString(options.headers.authorization));

        assertEqual(expectedEtag, metadata.etag);

        sandbox.restore();
    }

    async function putObject_withInvalidAccessKey() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const client = new AwsS3Client({
            logger: fakeLoggerWrapper,
            s3Region,
            s3AccessKey,
            s3SecretKey,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'info');

        const serverResponse = {
            statusCode: 403,
        };

        const serverResponseBuffer = '<xml>InvalidAccessKeyId</xml>';

        sandbox.stub(client, 'makeHttpRequest').returns(Promise.resolve(serverResponse));
        sandbox.stub(client, 'bufferResponseData').returns(Promise.resolve(serverResponseBuffer));

        const putOptions = {
            s3Bucket,
            s3StorageClass,
            contentType,
        };

        const jsonString = JSON.stringify({
            foo: 'bar',
            bar: 'baz',
            baz: [ 'foo', 'bar' ],
        });

        const objectBuff = Buffer.from(jsonString);

        let error;
        try {
            await client.putObject(putOptions, key, objectBuff);
        } catch (err) {
            error = err;
        }

        assert(error);
        assertEqual('InvalidAccessKeyId', error.code);

        assertEqual(1, client.bufferResponseData.callCount);

        sandbox.restore();
    }

    async function putObject_withInvalidSecretKey() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const client = new AwsS3Client({
            logger: fakeLoggerWrapper,
            s3Region,
            s3AccessKey,
            s3SecretKey,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'info');

        const serverResponse = {
            statusCode: 403,
        };

        const serverResponseBuffer = '<xml>SignatureDoesNotMatch</xml>';

        sandbox.stub(client, 'makeHttpRequest').returns(Promise.resolve(serverResponse));
        sandbox.stub(client, 'bufferResponseData').returns(Promise.resolve(serverResponseBuffer));

        const putOptions = {
            s3Bucket,
            s3StorageClass,
            contentType,
        };

        const jsonString = JSON.stringify({
            foo: 'bar',
            bar: 'baz',
            baz: [ 'foo', 'bar' ],
        });

        const objectBuff = Buffer.from(jsonString);

        let error;
        try {
            await client.putObject(putOptions, key, objectBuff);
        } catch (err) {
            error = err;
        }

        assert(error);
        assertEqual('SignatureDoesNotMatch', error.code);

        assertEqual(1, client.bufferResponseData.callCount);

        sandbox.restore();
    }

    async function putObject_withUnexpectedStatus() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const client = new AwsS3Client({
            logger: fakeLoggerWrapper,
            s3Region,
            s3AccessKey,
            s3SecretKey,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'info');

        const serverResponse = {
            statusCode: 403,
        };

        const serverResponseBuffer = '<xml>Some Other Problem</xml>';

        sandbox.stub(client, 'makeHttpRequest').returns(Promise.resolve(serverResponse));
        sandbox.stub(client, 'bufferResponseData').returns(Promise.resolve(serverResponseBuffer));

        const putOptions = {
            s3Bucket,
            s3StorageClass,
            contentType,
        };

        const jsonString = JSON.stringify({
            foo: 'bar',
            bar: 'baz',
            baz: [ 'foo', 'bar' ],
        });

        const objectBuff = Buffer.from(jsonString);

        let error;
        try {
            await client.putObject(putOptions, key, objectBuff);
        } catch (err) {
            error = err;
        }

        assert(error);
        assertEqual(403, error.code);

        assertEqual(1, client.bufferResponseData.callCount);

        sandbox.restore();
    }

    await putObject();
    await putObject_withInvalidAccessKey();
    await putObject_withInvalidSecretKey();
    await putObject_withUnexpectedStatus();
}
