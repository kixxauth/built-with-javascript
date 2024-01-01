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

const { assertEqual } = KixxAssert;


const DIRNAME = fromFileUrl(new URL('./', import.meta.url));
const ROOT_DIR = path.dirname(path.dirname(path.dirname(DIRNAME)));


export default async function test_renderPage_notFound() {

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
            return null;
        },
    };

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
        url: new URL('index.json', 'https://www.adkavy.org'),
    };

    const response = {};

    let error;

    try {
        await subject.renderPage(request, response, {
            page: 'home',
            template: 'home.html',
        });
    } catch (err) {
        error = err;
    }

    assertEqual('NotFoundError', error.name);
    assertEqual('NOT_FOUND_ERROR', error.code);

    sandbox.restore();
}