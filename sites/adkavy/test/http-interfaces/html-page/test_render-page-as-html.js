import path from 'node:path';
import sinon from 'sinon';
import { KixxAssert } from '../../../dependencies.js';
import { EventEmitter } from 'node:events';
import DataStore from '../../../lib/stores/data-store.js';
import BlobStore from '../../../lib/stores/blob-store.js';
import TemplateStore from '../../../lib/stores/template-store.js';
import HTMLPage from '../../../lib/http-interfaces/html-page.js';
import { fromFileUrl } from '../../../lib/utils.js';
import { FakeLoggerWrapper } from '../../testing-utils.js';

const { assert, assertEqual } = KixxAssert;


const DIRNAME = fromFileUrl(new URL('./', import.meta.url));
const ROOT_DIR = path.dirname(path.dirname(path.dirname(DIRNAME)));


export default async function test_renderPage_asJSON() {

    const pageRecord = {
        pageType: 'website',
        pageTitle: 'adk avy',
        pageDescription: 'adk avy is a place for winter enthusiasts in the Adirondacks to submit and learn from snowpack and avalanche observations.',
        pageImage: null,
        heroImage: {
            url: 'https://kixx-stage.imgix.net/fa045b93-3ae8-4851-846f-9e1b083b0942.jpg',
            alt: 'A skier carving turns through powder snow in back country mountains',
        },
    };

    // Create a Sinon sandbox for stubs isolated to this test.
    const sandbox = sinon.createSandbox();

    const loggerWrapper = new FakeLoggerWrapper();

    const eventBus = new EventEmitter();

    const config = {
        dataStore: {
            getEnvironment() {
                return 'development';
            },
        },
    };

    const dynamoDbClient = {
        getItem() {
            return Promise.resolve({
                type: 'page',
                id: 'home',
                attributes: pageRecord,
            });
        },
    };

    sinon.spy(dynamoDbClient, 'getItem');

    const dataStore = new DataStore({
        config,
        logger: new FakeLoggerWrapper(),
        dynamoDbClient,
    });

    const blobStore = new BlobStore();

    const templateStore = new TemplateStore({
        directory: path.join(ROOT_DIR, 'templates'),
        logger: new FakeLoggerWrapper(),
    });

    const subject = new HTMLPage({
        logger: loggerWrapper,
        eventBus,
        dataStore,
        blobStore,
        templateStore,
    });

    const request = {
        url: new URL('/', 'https://www.adkavy.org'),
    };

    const response = {
        respondWithHTML() {
        },
    };

    sinon.spy(response, 'respondWithHTML');

    await subject.renderPage(request, response, {
        page: 'home',
        template: 'home.html',
    });

    assertEqual(1, response.respondWithHTML.callCount);

    const [ status, body ] = response.respondWithHTML.firstCall.args;

    assertEqual(200, status);

    assert(body.startsWith('<!DOCTYPE html>'));
    assert(body.endsWith('</html>\n'));

    assertEqual(1, dynamoDbClient.getItem.callCount);

    const [ tableName, params ] = dynamoDbClient.getItem.firstCall.args;

    assertEqual('adkavy_development_entities', tableName);
    assertEqual('home', params.id);
    assertEqual('page', params.type);

    sandbox.restore();
}
