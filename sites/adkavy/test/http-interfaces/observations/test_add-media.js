import sinon from 'sinon';
import { KixxAssert } from '../../../dependencies.js';
import DataStore from '../../../lib/stores/data-store.js';
import Observations from '../../../lib/http-interfaces/observations.js';
import { FakeLoggerWrapper } from '../../testing-utils.js';

const { assert, assertEqual } = KixxAssert;


export default async function test_addMedia() {

    const contentType = 'video/quicktime';
    const contentLength = 3001;


    async function happyPath() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const dataStoreLoggerWrapper = new FakeLoggerWrapper();
        const observationsLoggerWrapper = new FakeLoggerWrapper();

        const config = {
            dataStore: {
                getEnvironment() {
                    return 'development';
                },
            },
        };

        const record = {
            id: 'foo-bar-baz',
            type: 'observation',
            attributes: {
            },
            meta: {
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
            },
        };

        const dynamoDbClient = {
            getItem() {
                return Promise.resolve(record);
            },
            putItem() {
                return Promise.resolve(true);
            },
        };

        sinon.spy(dynamoDbClient, 'getItem');
        sinon.spy(dynamoDbClient, 'putItem');

        const mediaResponse = {
            id: 'media-object-id',
            contentType,
            contentLength,
            md5Hash: 'media-object-hash',
            version: 'media-object-version',
            mediaOutput: {
                format: 'MP4_H264_AAC',
                pathname: 'media-object-id',
                videoFilename: 'video.mp4',
                posterFilename: 'video.00000000.jpg',
            },
            links: {
                object: {
                    origin: 'https://origin.net/object',
                    cdns: [ 'https://cdn.net/object' ],
                },
                mediaResource: {
                    origin: 'https://origin.net/media-resource',
                    cdns: [ 'https://cdn.net/media-resource' ],
                },
                mediaPoster: {
                    origin: 'https://origin.net/media-poster',
                    cdns: [ 'https://cdn.net/media-poster' ],
                },
            },
        };

        const objectManagementClient = {
            uploadMedia() {
                return Promise.resolve(mediaResponse);
            },
        };

        sinon.spy(objectManagementClient, 'uploadMedia');

        const dataStore = new DataStore({
            config,
            logger: dataStoreLoggerWrapper,
            dynamoDbClient,
        });

        const subject = new Observations({
            logger: observationsLoggerWrapper,
            dataStore,
            objectManagementClient,
        });

        const readStream = {
            pipe() {},
        };

        const requestHeaders = new Headers();
        requestHeaders.set('content-type', contentType);
        requestHeaders.set('content-length', contentLength.toString());

        const request = {
            pathnameParams: {
                observationId: 'foo-bar-baz',
                filename: 'some-video.mov',
            },
            headers: requestHeaders,
            getReadStream() {
                return readStream;
            },
        };

        const response = {
            respondWithJSON() {},
        };

        sinon.spy(response, 'respondWithJSON');

        await subject.addMedia(request, response);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ status, body ] = response.respondWithJSON.firstCall.args;

        assertEqual(201, status);

        assertEqual('media', body.data.type);
        assertEqual('media-object-id', body.data.id);

        assertEqual(contentType, body.data.attributes.contentType);
        assertEqual(contentLength, body.data.attributes.contentLength);
        assertEqual('media-object-hash', body.data.attributes.md5Hash);
        assertEqual('media-object-version', body.data.attributes.version);
        assertEqual('https://origin.net/media-resource', body.data.attributes.mediaURLs.origin);
        assertEqual('https://cdn.net/media-resource', body.data.attributes.mediaURLs.cdns[0]);
        assertEqual('https://origin.net/media-poster', body.data.attributes.posterURLs.origin);
        assertEqual('https://cdn.net/media-poster', body.data.attributes.posterURLs.cdns[0]);

        assertEqual(1, objectManagementClient.uploadMedia.callCount);
        const [ fileSourceStream, mediaOptions ] = objectManagementClient.uploadMedia.firstCall.args;

        assertEqual(readStream, fileSourceStream);
        assertEqual(contentType, mediaOptions.contentType);
        assertEqual(contentLength, mediaOptions.contentLength);
        assertEqual('observations/foo-bar-baz/000.mov', mediaOptions.key);
        assert(mediaOptions.processingParams);

        assertEqual(1, dynamoDbClient.getItem.callCount);
        const [ getTable, observationKey ] = dynamoDbClient.getItem.firstCall.args;

        assertEqual('adkavy_development_entities', getTable);
        assertEqual('observation', observationKey.type);
        assertEqual('foo-bar-baz', observationKey.id);

        assertEqual(1, dynamoDbClient.putItem.callCount);
        const [ putTable, obj ] = dynamoDbClient.putItem.firstCall.args;

        assertEqual('adkavy_development_entities', putTable);
        assertEqual('observation', obj.type);
        assertEqual('foo-bar-baz', obj.id);

        const item = obj.relationships.media[0];

        assertEqual('media', item.type);
        assertEqual('media-object-id', item.id);

        assertEqual(contentType, item.attributes.contentType);
        assertEqual(contentLength, item.attributes.contentLength);
        assertEqual('media-object-hash', item.attributes.md5Hash);
        assertEqual('media-object-version', item.attributes.version);
        assertEqual('https://origin.net/media-resource', item.attributes.mediaURLs.origin);
        assertEqual('https://cdn.net/media-resource', item.attributes.mediaURLs.cdns[0]);
        assertEqual('https://origin.net/media-poster', item.attributes.posterURLs.origin);
        assertEqual('https://cdn.net/media-poster', item.attributes.posterURLs.cdns[0]);

        sandbox.restore();
    }

    await happyPath();
}
