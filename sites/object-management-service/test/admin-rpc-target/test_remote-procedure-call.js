import sinon from 'sinon';
import AdminRPCTarget from '../../lib/http-interfaces/admin-rpc-target.js';
import { JSONParsingError } from '../../lib/errors.js';
import { KixxAssert } from '../../dependencies.js';
import { FakeLoggerWrapper } from '../testing-utils.js';


const { assert, assertEqual } = KixxAssert;


class ApplicationConfig {
    getEnvironment() {
        return 'testing';
    }
}


export default async function test_remoteProcedureCall() {

    async function withHTTP() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};

        const request = {
            url: new URL('http://object-management-service.net/admin-rpc'),
            json: sandbox.stub().throws(new JSONParsingError('TEST_ERROR')),
        };

        let response = {
            respondWithRedirect: sandbox.stub().returnsThis(),
        };

        const subject = new AdminRPCTarget({
            config: { application: new ApplicationConfig() },
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        sandbox.stub(subject, 'authenticateAdminUser').returns(Promise.resolve(null));
        sandbox.stub(subject, 'createScopedToken').returns(Promise.resolve(null));

        response = await subject.remoteProcedureCall(request, response);

        assertEqual(1, response.respondWithRedirect.callCount);

        const [ statusCode, newLocation ] = response.respondWithRedirect.firstCall.args;

        assertEqual(301, statusCode);
        assertEqual('https://object-management-service.net/admin-rpc', newLocation);
    }

    async function withInvalidJSON() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};

        const request = {
            url: new URL('https://object-management-service.net/admin-rpc'),
            json: sandbox.stub().throws(new JSONParsingError('TEST_ERROR')),
        };

        let response = {
            respondWithJSON: sandbox.stub().returnsThis(),
        };

        const subject = new AdminRPCTarget({
            config: { application: new ApplicationConfig() },
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        sandbox.stub(subject, 'authenticateAdminUser').returns(Promise.resolve(null));
        sandbox.stub(subject, 'createScopedToken').returns(Promise.resolve(null));

        response = await subject.remoteProcedureCall(request, response);

        assertEqual(1, subject.authenticateAdminUser.callCount);
        assertEqual(request, subject.authenticateAdminUser.firstCall.args[0]);

        assert(subject.createScopedToken.notCalled);
        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual(null, jsonResponse.id);
        assertEqual('TEST_ERROR', jsonResponse.error.message);
        assertEqual(-32700, jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    async function withJSONBufferingError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const error = new Error('TEST_ERROR');
        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};

        const request = {
            url: new URL('https://object-management-service.net/admin-rpc'),
            json: sandbox.stub().throws(error),
        };

        let response = {
            respondWithJSON: sandbox.stub().returnsThis(),
        };

        const subject = new AdminRPCTarget({
            config: { application: new ApplicationConfig() },
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        sandbox.stub(subject, 'authenticateAdminUser').returns(Promise.resolve(null));
        sandbox.stub(subject, 'createScopedToken').returns(Promise.resolve(null));

        response = await subject.remoteProcedureCall(request, response);

        assertEqual(1, subject.authenticateAdminUser.callCount);
        assertEqual(request, subject.authenticateAdminUser.firstCall.args[0]);
        assert(subject.createScopedToken.notCalled);

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
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    async function withInvalidId() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};

        const json = {
            // The "id" is undefined.
            method: 'createScopedToken',
            params: { scopeId: '082bf691-5d4d-44b0-9b36-0e80d10b2b56' },
        };

        const request = {
            url: new URL('https://object-management-service.net/admin-rpc'),
            json: sandbox.stub().returns(Promise.resolve(json)),
        };

        let response = {
            respondWithJSON: sandbox.stub().returnsThis(),
        };

        const subject = new AdminRPCTarget({
            config: { application: new ApplicationConfig() },
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        sandbox.stub(subject, 'authenticateAdminUser').returns(Promise.resolve(null));
        sandbox.stub(subject, 'createScopedToken').returns(Promise.resolve(null));

        response = await subject.remoteProcedureCall(request, response);

        assertEqual(1, subject.authenticateAdminUser.callCount);
        assertEqual(request, subject.authenticateAdminUser.firstCall.args[0]);

        assert(subject.createScopedToken.notCalled);
        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual(null, jsonResponse.id);
        assertEqual('Invalid "id" member undefined', jsonResponse.error.message);
        assertEqual(-32600, jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    async function withInvalidMethodName() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};

        const json = {
            id: 'foo-bar-baz',
            // The "method" is undefined.
            params: { scopeId: '082bf691-5d4d-44b0-9b36-0e80d10b2b56' },
        };

        const request = {
            url: new URL('https://object-management-service.net/admin-rpc'),
            json: sandbox.stub().returns(Promise.resolve(json)),
        };

        let response = {
            respondWithJSON: sandbox.stub().returnsThis(),
        };

        const subject = new AdminRPCTarget({
            config: { application: new ApplicationConfig() },
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        sandbox.stub(subject, 'authenticateAdminUser').returns(Promise.resolve(null));
        sandbox.stub(subject, 'createScopedToken').returns(Promise.resolve(null));

        response = await subject.remoteProcedureCall(request, response);

        assertEqual(1, subject.authenticateAdminUser.callCount);
        assertEqual(request, subject.authenticateAdminUser.firstCall.args[0]);

        assert(subject.createScopedToken.notCalled);
        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual('foo-bar-baz', jsonResponse.id);
        assertEqual('Invalid "method" member undefined', jsonResponse.error.message);
        assertEqual(-32600, jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    async function whenMethodNameDoesNotExist() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};

        const json = {
            id: 'foo-bar-baz',
            method: 'remoteProcedureCall',
            params: { scopeId: '082bf691-5d4d-44b0-9b36-0e80d10b2b56' },
        };

        const request = {
            url: new URL('https://object-management-service.net/admin-rpc'),
            json: sandbox.stub().returns(Promise.resolve(json)),
        };

        let response = {
            respondWithJSON: sandbox.stub().returnsThis(),
        };

        const subject = new AdminRPCTarget({
            config: { application: new ApplicationConfig() },
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        sandbox.stub(subject, 'authenticateAdminUser').returns(Promise.resolve(null));
        sandbox.stub(subject, 'createScopedToken').returns(Promise.resolve(null));

        response = await subject.remoteProcedureCall(request, response);

        assertEqual(1, subject.authenticateAdminUser.callCount);
        assertEqual(request, subject.authenticateAdminUser.firstCall.args[0]);

        assert(subject.createScopedToken.notCalled);
        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual('foo-bar-baz', jsonResponse.id);
        assertEqual('The method "remoteProcedureCall" cannot be found.', jsonResponse.error.message);
        assertEqual(-32601, jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    async function withInvalidParamsError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};
        const error = new Error('TEST_INVALID_PARAMS');
        error.code = -32602;

        const json = {
            id: 'foo-bar-baz',
            method: 'createScopedToken',
            params: [],
        };

        const request = {
            url: new URL('https://object-management-service.net/admin-rpc'),
            json: sandbox.stub().returns(Promise.resolve(json)),
        };

        let response = {
            respondWithJSON: sandbox.stub().returnsThis(),
        };

        const subject = new AdminRPCTarget({
            config: { application: new ApplicationConfig() },
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        sandbox.stub(subject, 'authenticateAdminUser').returns(Promise.resolve(null));
        sandbox.stub(subject, 'createScopedToken').throws(error);

        response = await subject.remoteProcedureCall(request, response);

        assertEqual(1, subject.authenticateAdminUser.callCount);
        assertEqual(request, subject.authenticateAdminUser.firstCall.args[0]);

        assertEqual(1, subject.createScopedToken.callCount);

        assert(logger.error.notCalled);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual('foo-bar-baz', jsonResponse.id);
        assertEqual('TEST_INVALID_PARAMS', jsonResponse.error.message);
        assertEqual(-32602, jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    async function withInternalError() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const fakeLoggerWrapper = new FakeLoggerWrapper();
        const dataStore = {};

        const error = new Error('TEST_ERROR');

        const json = {
            id: 'foo-bar-baz',
            method: 'createScopedToken',
            params: { scopeId: '082bf691-5d4d-44b0-9b36-0e80d10b2b56' },
        };

        const request = {
            url: new URL('https://object-management-service.net/admin-rpc'),
            json: sandbox.stub().returns(Promise.resolve(json)),
        };

        let response = {
            respondWithJSON: sandbox.stub().returnsThis(),
        };

        const subject = new AdminRPCTarget({
            config: { application: new ApplicationConfig() },
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;
        sandbox.stub(logger, 'error');

        sandbox.stub(subject, 'authenticateAdminUser').returns(Promise.resolve(null));
        sandbox.stub(subject, 'createScopedToken').throws(error);

        response = await subject.remoteProcedureCall(request, response);

        assertEqual(1, subject.authenticateAdminUser.callCount);
        assertEqual(request, subject.authenticateAdminUser.firstCall.args[0]);

        assertEqual(1, subject.createScopedToken.callCount);

        assertEqual(1, logger.error.callCount);
        const info = logger.error.firstCall.args[1];
        assertEqual(error, info.error);

        assertEqual(1, response.respondWithJSON.callCount);

        const [ statusCode, jsonResponse ] = response.respondWithJSON.firstCall.args;

        assertEqual(200, statusCode);

        assertEqual('2.0', jsonResponse.jsonrpc);
        assertEqual('foo-bar-baz', jsonResponse.id);
        assertEqual('Internal RPC Error.', jsonResponse.error.message);
        assertEqual(-32603, jsonResponse.error.code);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    await withHTTP();
    await withInvalidJSON();
    await withJSONBufferingError();
    await withInvalidId();
    await withInvalidMethodName();
    await whenMethodNameDoesNotExist();
    await withInvalidParamsError();
    await withInternalError();
}

