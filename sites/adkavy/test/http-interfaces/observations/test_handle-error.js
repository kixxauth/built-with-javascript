import sinon from 'sinon';
import { KixxAssert } from '../../../dependencies.js';
import Observations from '../../../lib/http-interfaces/observations.js';
import { ValidationError } from '../../../lib/errors.js';
import { FakeLoggerWrapper } from '../../testing-utils.js';

const { assertEqual } = KixxAssert;


export default function test_handleError() {

    function handleError_withSingleValidationError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const subject = new Observations({
            logger: fakeLoggerWrapper,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        const error = new ValidationError('Custom error message');

        const req = {};

        const res = {
            respondWithJSON: sandbox.spy(),
        };

        subject.handleError(error, req, res);

        assertEqual(1, res.respondWithJSON.callCount);
        assertEqual(0, logger.error.callCount);

        const [ status, json ] = res.respondWithJSON.firstCall.args;

        assertEqual(400, status);
        const err = json.errors[0];
        assertEqual(400, err.status);
        assertEqual('VALIDATION_ERROR', err.code);
        assertEqual('ValidationError', err.title);
        assertEqual('Custom error message', err.detail);

        sandbox.restore();
        logger.dispose();
    }

    function handleError_withMultiValidationError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const subject = new Observations({
            logger: fakeLoggerWrapper,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        const error = new ValidationError('Custom error message');

        error.push('message 1', 'foo.bar');
        error.push('message 2', 'bar.foo');

        const req = {};

        const res = {
            respondWithJSON: sandbox.spy(),
        };

        subject.handleError(error, req, res);

        assertEqual(1, res.respondWithJSON.callCount);
        assertEqual(0, logger.error.callCount);

        const [ status, json ] = res.respondWithJSON.firstCall.args;

        assertEqual(400, status);
        assertEqual(2, json.errors.length);

        let err = json.errors[0];
        assertEqual(400, err.status);
        assertEqual('VALIDATION_ERROR', err.code);
        assertEqual('ValidationError', err.title);
        assertEqual('message 1', err.detail);

        err = json.errors[1];
        assertEqual(400, err.status);
        assertEqual('VALIDATION_ERROR', err.code);
        assertEqual('ValidationError', err.title);
        assertEqual('message 2', err.detail);

        sandbox.restore();
        logger.dispose();
    }

    function handleError_withNotFoundError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const subject = new Observations({
            logger: fakeLoggerWrapper,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        const error = new Error('This is a custom message');
        error.code = 'NOT_FOUND_ERROR';

        const req = {};

        const res = {
            respondWithJSON: sandbox.spy(),
        };

        subject.handleError(error, req, res);

        assertEqual(1, res.respondWithJSON.callCount);
        assertEqual(0, logger.error.callCount);

        const [ status, json ] = res.respondWithJSON.firstCall.args;

        assertEqual(404, status);
        const err = json.errors[0];
        assertEqual(404, err.status);
        assertEqual('NOT_FOUND_ERROR', err.code);
        assertEqual('NotFoundError', err.title);
        assertEqual('This is a custom message', err.detail);

        sandbox.restore();
        logger.dispose();
    }

    function handleError_withConflictError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const subject = new Observations({
            logger: fakeLoggerWrapper,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        const error = new Error('This is a custom message');
        error.code = 'CONFLICT_ERROR';

        const req = {};

        const res = {
            respondWithJSON: sandbox.spy(),
        };

        subject.handleError(error, req, res);

        assertEqual(1, res.respondWithJSON.callCount);
        assertEqual(0, logger.error.callCount);

        const [ status, json ] = res.respondWithJSON.firstCall.args;

        assertEqual(409, status);
        const err = json.errors[0];
        assertEqual(409, err.status);
        assertEqual('CONFLICT_ERROR', err.code);
        assertEqual('ConflictError', err.title);
        assertEqual('This is a custom message', err.detail);

        sandbox.restore();
        logger.dispose();
    }

    function handleError_withBadRequestError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const subject = new Observations({
            logger: fakeLoggerWrapper,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        const error = new Error('This is a custom message');
        error.code = 'BAD_REQUEST_ERROR';

        const req = {};

        const res = {
            respondWithJSON: sandbox.spy(),
        };

        subject.handleError(error, req, res);

        assertEqual(1, res.respondWithJSON.callCount);
        assertEqual(0, logger.error.callCount);

        const [ status, json ] = res.respondWithJSON.firstCall.args;

        assertEqual(400, status);
        const err = json.errors[0];
        assertEqual(400, err.status);
        assertEqual('BAD_REQUEST_ERROR', err.code);
        assertEqual('BadRequestError', err.title);
        assertEqual('This is a custom message', err.detail);

        sandbox.restore();
        logger.dispose();
    }

    function handleError_withUnknownErrorCode() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const subject = new Observations({
            logger: fakeLoggerWrapper,
        });

        // Get a handle on the logger after it has been
        // created by the subject module above.
        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        const error = new Error('TEST ERROR');
        error.code = 'CUSTOM_ERROR_CODE';

        const req = {};

        const res = {
            respondWithJSON: sandbox.spy(),
        };

        subject.handleError(error, req, res);

        assertEqual(1, res.respondWithJSON.callCount);
        assertEqual(1, logger.error.callCount);

        const [ status, json ] = res.respondWithJSON.firstCall.args;

        assertEqual(500, status);
        const err = json.errors[0];
        assertEqual(500, err.status);
        assertEqual('INTERNAL_SERVER_ERROR', err.code);
        assertEqual('InternalServerError', err.title);
        assertEqual('Unexpected internal server error.', err.detail);

        sandbox.restore();
        logger.dispose();
    }

    handleError_withSingleValidationError();
    handleError_withMultiValidationError();
    handleError_withNotFoundError();
    handleError_withConflictError();
    handleError_withBadRequestError();
    handleError_withUnknownErrorCode();
}
