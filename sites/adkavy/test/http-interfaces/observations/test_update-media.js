import sinon from 'sinon';
import { KixxAssert } from '../../../dependencies.js';
import DataStore from '../../../lib/stores/data-store.js';
import Observations from '../../../lib/http-interfaces/observations.js';
import { FakeLoggerWrapper } from '../../testing-utils.js';

const { assertEqual } = KixxAssert;


export default async function test_addMedia() {

    const newTitle = 'New Media Title';
    const newDetails = 'New media details.';


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
            attributes: {},
            relationships: {
                media: [{
                    type: 'media',
                    id: 'the-media-id',
                    attributes: {
                        md5Hash: 'media-object-hash',
                        version: 'media-object-version',
                    },
                }],
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

        const dataStore = new DataStore({
            config,
            logger: dataStoreLoggerWrapper,
            dynamoDbClient,
        });

        const subject = new Observations({
            logger: observationsLoggerWrapper,
            dataStore,
            objectManagementClient: {},
        });

        const patch = {
            id: 'the-media-id',
            type: 'media',
            attributes: {
                title: newTitle,
                details: newDetails,
            },
        };

        const request = {
            pathnameParams: {
                observationId: 'foo-bar-baz',
                filename: 'the-media-id',
            },
            json() {
                return Promise.resolve({ data: patch });
            },
        };

        const response = {
            respondWithJSON() {},
        };

        sinon.spy(response, 'respondWithJSON');

        await subject.updateMedia(request, response);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ status, body ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, status);

        assertEqual('media', body.data.type);
        assertEqual('the-media-id', body.data.id);

        assertEqual('media-object-hash', body.data.attributes.md5Hash);
        assertEqual('media-object-version', body.data.attributes.version);
        assertEqual(newTitle, body.data.attributes.title);
        assertEqual(newDetails, body.data.attributes.details);

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
        assertEqual('the-media-id', item.id);

        assertEqual('media-object-hash', item.attributes.md5Hash);
        assertEqual('media-object-version', item.attributes.version);
        assertEqual(newTitle, item.attributes.title);
        assertEqual(newDetails, item.attributes.details);

        sandbox.restore();
    }

    await happyPath();
}
