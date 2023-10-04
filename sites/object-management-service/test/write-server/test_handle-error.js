import sinon from 'sinon';
import WriteServer from '../../lib/http-interfaces/write-server.js';
import {
    UnauthorizedError,
    ForbiddenError,
    ValidationError } from '../../lib/errors.js';
import { KixxAssert } from '../../dependencies.js';
import { FakeLoggerWrapper } from '../testing-utils.js';


const { assert, assertEqual } = KixxAssert;


export default function test_handleError() {

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

        const subject = new WriteServer({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        subject.handleError(error, request, response);

        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(401, statusCode);

        const { errors } = jsonResponse;

        assert(Array.isArray(errors));
        assertEqual(401, errors[0].status);
        assertEqual('UNAUTHORIZED_ERROR', errors[0].code);
        assertEqual('UnauthorizedError', errors[0].title);
        assertEqual('TEST_ERROR', errors[0].detail);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
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

        const subject = new WriteServer({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        subject.handleError(error, request, response);

        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(403, statusCode);

        const { errors } = jsonResponse;

        assert(Array.isArray(errors));
        assertEqual(403, errors[0].status);
        assertEqual('FORBIDDEN_ERROR', errors[0].code);
        assertEqual('ForbiddenError', errors[0].title);
        assertEqual('TEST_ERROR', errors[0].detail);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    function handleError_single_ValidationError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};
        const error = new ValidationError('TEST_ERROR');
        const request = {};

        const response = {
            respondWithJSON: sandbox.stub().callsFake(() => {
                return response;
            }),
        };

        const subject = new WriteServer({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        subject.handleError(error, request, response);

        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(400, statusCode);

        const { errors } = jsonResponse;

        assert(Array.isArray(errors));
        assertEqual(1, errors.length);
        assertEqual(400, errors[0].status);
        assertEqual('VALIDATION_ERROR', errors[0].code);
        assertEqual('ValidationError', errors[0].title);
        assertEqual('TEST_ERROR', errors[0].detail);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    function handleError_multiple_ValidationError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};
        const error = new ValidationError('TEST_ERROR');
        const request = {};

        error.push('TEST_ERROR_1', {
            pointer: 'foo',
        });

        error.push('TEST_ERROR_2', {
            pointer: 'bar',
        });

        const response = {
            respondWithJSON: sandbox.stub().callsFake(() => {
                return response;
            }),
        };

        const subject = new WriteServer({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        subject.handleError(error, request, response);

        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(400, statusCode);

        const { errors } = jsonResponse;

        assert(Array.isArray(errors));
        assertEqual(2, errors.length);

        assertEqual(400, errors[0].status);
        assertEqual('VALIDATION_ERROR', errors[0].code);
        assertEqual('ValidationError', errors[0].title);
        assertEqual('TEST_ERROR_1', errors[0].detail);
        assertEqual('foo', errors[0].source.pointer);

        assertEqual(400, errors[1].status);
        assertEqual('VALIDATION_ERROR', errors[1].code);
        assertEqual('ValidationError', errors[1].title);
        assertEqual('TEST_ERROR_2', errors[1].detail);
        assertEqual('bar', errors[1].source.pointer);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
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

        const subject = new WriteServer({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        subject.handleError(error, request, response);

        assertEqual(1, logger.error.callCount);
        const info = logger.error.firstCall.args[1];
        assertEqual(error, info.error);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(500, statusCode);

        const { errors } = jsonResponse;

        assert(Array.isArray(errors));
        assertEqual(500, errors[0].status);
        assertEqual('INTERNAL_SERVER_ERROR', errors[0].code);
        assertEqual('Error', errors[0].title);
        assertEqual('Unexpected internal server error.', errors[0].detail);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    handleError_UnauthorizedError();
    handleError_ForbiddenError();
    handleError_single_ValidationError();
    handleError_multiple_ValidationError();
    handleError_AnyOtherError();
}
