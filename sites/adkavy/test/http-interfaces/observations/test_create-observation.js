import sinon from 'sinon';
import { KixxAssert } from '../../../dependencies.js';
import DataStore from '../../../lib/stores/data-store.js';
import Observations from '../../../lib/http-interfaces/observations.js';
import { UUID_PATTERN, ISO_DATE_PATTERN, FakeLoggerWrapper } from '../../testing-utils.js';

const { assertEqual, assertMatches, assertUndefined } = KixxAssert;


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

        const dynamoDbClient = {
            putItem() {
            },
        };

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

        const data = {
            type: 'observation',
            attributes: {
                observationDateTime: '2023-04-01T12:12:00-04:00',
                name: 'Emily Riddle',
                travelMode: 'skiing_or_snowboarding',
                elevation: '2300',
            },
        };

        const request = {
            json() {
                return Promise.resolve({ data });
            },
        };

        const response = {
            respondWithJSON() {
            },
        };

        sinon.spy(response, 'respondWithJSON');

        await subject.createObservation(request, response);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ status, body ] = response.respondWithJSON.firstCall.args;

        assertEqual(201, status);

        assertMatches(UUID_PATTERN, body.data.id);
        assertEqual('observation', body.data.type);
        assertEqual('Emily Riddle', body.data.attributes.name);
        assertEqual('skiing_or_snowboarding', body.data.attributes.travelMode);
        assertEqual('2300', body.data.attributes.elevation);
        assertEqual('2023-04-01T12:12:00-04:00', body.data.attributes.observationDateTime);
        assertMatches(ISO_DATE_PATTERN, body.meta.created);
        assertMatches(ISO_DATE_PATTERN, body.meta.updated);
        assertUndefined(body.data.key_observationDateTime);
        assertUndefined(body.data.attributes.key_observationDateTime);

        assertEqual(1, dynamoDbClient.putItem.callCount);
        const [ table, obj ] = dynamoDbClient.putItem.firstCall.args;

        assertEqual('adkavy_development_entities', table);
        assertMatches(UUID_PATTERN, obj.id);
        assertEqual('observation', obj.type);
        assertEqual('Emily Riddle', obj.attributes.name);
        assertEqual('skiing_or_snowboarding', obj.attributes.travelMode);
        assertEqual('2300', obj.attributes.elevation);
        assertEqual('2023-04-01T16:12:00.000Z', obj.key_observationDateTime);
        assertMatches(ISO_DATE_PATTERN, obj.meta.created);
        assertMatches(ISO_DATE_PATTERN, obj.meta.updated);

        sandbox.restore();
    }

    await happyPath();
}
