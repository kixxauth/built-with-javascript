import sinon from 'sinon';
import { KixxAssert } from '../../../dependencies.js';
import DataStore from '../../../lib/stores/data-store.js';
import Observations from '../../../lib/http-interfaces/observations.js';
import { ISO_DATE_PATTERN, FakeLoggerWrapper } from '../../testing-utils.js';

const { assertEqual, assertMatches, assertUndefined, assertNotEqual } = KixxAssert;


export default async function test_createObservation() {

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

        const recordDate = new Date();
        recordDate.setYear(2022);

        const record = {
            id: 'foo-bar-baz',
            type: 'observation',
            attributes: {
                observationDateTime: new Date().toISOString(),
                name: 'Emily Riddle',
                travelMode: 'skiing_or_snowboarding',
                elevation: '2300',
            },
            meta: {
                created: recordDate.toISOString(),
                updated: recordDate.toISOString(),
            },
            key_observationDateTime: new Date().toISOString(),
        };

        const dynamoDbClient = {
            getItem() {
                return Promise.resolve(record);
            },
            putItem() {
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
        });

        const observationDateTime = new Date();
        observationDateTime.setYear(2022);

        const data = {
            id: 'foo-bar-baz',
            type: 'observation',
            attributes: {
                email: 'emily@example.com',
                aspect: 'ne',
                observationDateTime: observationDateTime.toISOString(),
            },
        };

        const request = {
            pathnameParams: {
                observationId: 'foo-bar-baz',
            },
            json() {
                return Promise.resolve({ data });
            },
        };

        const response = {
            respondWithJSON() {
            },
        };

        sinon.spy(response, 'respondWithJSON');

        await subject.updateObservation(request, response);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ status, body ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, status);

        assertEqual('foo-bar-baz', body.data.id);
        assertEqual('observation', body.data.type);
        assertEqual('Emily Riddle', body.data.attributes.name);
        assertEqual('skiing_or_snowboarding', body.data.attributes.travelMode);
        assertEqual('2300', body.data.attributes.elevation);
        assertEqual('emily@example.com', body.data.attributes.email);
        assertEqual('ne', body.data.attributes.aspect);
        assertEqual(observationDateTime.toISOString(), body.data.attributes.observationDateTime);
        assertMatches(ISO_DATE_PATTERN, body.meta.created);
        assertMatches(ISO_DATE_PATTERN, body.meta.updated);
        assertNotEqual(body.meta.created, body.meta.updated);
        assertUndefined(body.data.key_observationDateTime);
        assertUndefined(body.data.attributes.key_observationDateTime);

        assertEqual(1, dynamoDbClient.getItem.callCount);
        const [ getTable, observationKey ] = dynamoDbClient.getItem.firstCall.args;

        assertEqual('adkavy_development_entities', getTable);
        assertEqual('observation', observationKey.type);
        assertEqual('foo-bar-baz', observationKey.id);

        assertEqual(1, dynamoDbClient.putItem.callCount);
        const [ putTable, obj ] = dynamoDbClient.putItem.firstCall.args;

        assertEqual('adkavy_development_entities', putTable);
        assertEqual('foo-bar-baz', obj.id);
        assertEqual('observation', obj.type);
        assertEqual('Emily Riddle', obj.attributes.name);
        assertEqual('skiing_or_snowboarding', obj.attributes.travelMode);
        assertEqual('2300', obj.attributes.elevation);
        assertEqual('emily@example.com', body.data.attributes.email);
        assertEqual('ne', body.data.attributes.aspect);
        assertEqual(body.data.attributes.observationDateTime, obj.key_observationDateTime);
        assertEqual(recordDate.toISOString(), obj.meta.created);
        assertMatches(ISO_DATE_PATTERN, obj.meta.updated);
        assertNotEqual(obj.meta.created, obj.meta.updated);
        assertEqual(2022, new Date(obj.meta.created).getFullYear());

        sandbox.restore();
    }

    await happyPath();
}
