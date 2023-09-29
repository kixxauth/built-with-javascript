import sinon from 'sinon';
import AdminRPCTarget from '../../lib/http-interfaces/admin-rpc-target.js';
import {
    UnauthorizedError,
    ForbiddenError,
    JSONParsingError } from '../../lib/errors.js';
import { KixxAssert } from '../../dependencies.js';
import { FakeLoggerWrapper } from '../testing-utils.js';


const { assert, assertEqual } = KixxAssert;


export default function test_handleError() {

    function handleError_JSONParsingError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};
        const error = new JSONParsingError('TEST_ERROR');
        const request = {};

        const response = {
            respondWithJSON: sandbox.stub().callsFake(() => {
                return response;
            }),
        };

        const providedJSONResponse = { jsonrpc: '2.0', id: 'foo-bar-baz' };

        const subject = new AdminRPCTarget({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger);

        subject.handleError(error, request, response, providedJSONResponse);

        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual('foo-bar-baz', jsonResponse.id);
        assertEqual('TEST_ERROR', jsonResponse.error.message);
        assertEqual(-32700, jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    function handleError_UnauthorizedError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};
        const error = new UnauthorizedError('TEST_ERROR');
        const request = {};

        const response = {
            respondWithJSON: sandbox.stub().callsFake(() => {
                return response;
            }),
        };

        const subject = new AdminRPCTarget({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger);

        subject.handleError(error, request, response);

        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual(null, jsonResponse.id);
        assertEqual('TEST_ERROR', jsonResponse.error.message);
        assertEqual('UNAUTHORIZED_ERROR', jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    function handleError_ForbiddenError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};
        const error = new ForbiddenError('TEST_ERROR');
        const request = {};

        const response = {
            respondWithJSON: sandbox.stub().callsFake(() => {
                return response;
            }),
        };

        const subject = new AdminRPCTarget({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger);

        subject.handleError(error, request, response);

        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual(null, jsonResponse.id);
        assertEqual('TEST_ERROR', jsonResponse.error.message);
        assertEqual('FORBIDDEN_ERROR', jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    function handleError_StandardJSON_RPC_Error() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};
        const error = { code: -1, message: 'standard JSON RPC error' };
        const request = {};

        const response = {
            respondWithJSON: sandbox.stub().callsFake(() => {
                return response;
            }),
        };

        const providedJSONResponse = { jsonrpc: '2.0', id: 'foo-bar-baz' };

        const subject = new AdminRPCTarget({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger);

        subject.handleError(error, request, response, providedJSONResponse);

        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual('foo-bar-baz', jsonResponse.id);
        assertEqual('standard JSON RPC error', jsonResponse.error.message);
        assertEqual(-1, jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    function handleError_AnyOtherError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};
        const error = new Error('TEST_ERROR');
        const request = {};

        const response = {
            respondWithJSON: sandbox.stub().callsFake(() => {
                return response;
            }),
        };

        const subject = new AdminRPCTarget({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger);

        subject.handleError(error, request, response);

        assertEqual(1, logger.error.callCount);
        const info = logger.error.firstCall.args[1];
        assertEqual(error, info.error);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual(null, jsonResponse.id);
        assertEqual('Internal RPC Error.', jsonResponse.error.message);
        assertEqual(-32603, jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    handleError_JSONParsingError();
    handleError_UnauthorizedError();
    handleError_ForbiddenError();
    handleError_StandardJSON_RPC_Error();
    handleError_AnyOtherError();
}
