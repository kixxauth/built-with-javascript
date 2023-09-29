import sinon from 'sinon';
import AdminRPCTarget from '../../lib/http-interfaces/admin-rpc-target.js';
import { KixxAssert } from '../../dependencies.js';
import { FakeLoggerWrapper } from '../testing-utils.js';


const { assert, assertEqual, isNonEmptyString } = KixxAssert;


export default async function test_createScopedToken() {

    async function withInvalidParamsObject(undef) {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const scope = {
            type: 'scope',
            id: '082bf691-5d4d-44b0-9b36-0e80d10b2b56',
            accessTokens: [],
        };

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const dataStore = {
            fetch: sandbox.stub().returns(Promise.resolve(scope)),
        };

        const subject = new AdminRPCTarget({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;

        let didThrow = false;
        try {
            await subject.createScopedToken(undef);
        } catch (error) {
            didThrow = true;
            assertEqual(-32602, error.code);
            assertEqual('Invalid params; expects plain object not undefined', error.message);
        }

        assert(didThrow);
        assert(dataStore.fetch.notCalled);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    async function withInvalidScopeId() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const scope = {
            type: 'scope',
            id: '082bf691-5d4d-44b0-9b36-0e80d10b2b56',
            accessTokens: [],
        };

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const dataStore = {
            fetch: sandbox.stub().returns(Promise.resolve(scope)),
        };

        const subject = new AdminRPCTarget({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;

        let didThrow = false;
        try {
            await subject.createScopedToken({});
        } catch (error) {
            didThrow = true;
            assertEqual(-32602, error.code);
            assertEqual('Invalid scopeId; expects String not undefined', error.message);
        }

        assert(didThrow);
        assert(dataStore.fetch.notCalled);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    async function scopeNotFound() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const scopeId = '082bf691-5d4d-44b0-9b36-0e80d10b2b56';

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const dataStore = {
            fetch: sandbox.stub().returns(Promise.resolve(null)),
        };

        const subject = new AdminRPCTarget({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;

        let didThrow = false;
        try {
            await subject.createScopedToken({ scopeId });
        } catch (error) {
            didThrow = true;
            assertEqual('NOT_FOUND_ERROR', error.code);
            assertEqual(`The scope "${ scopeId }" could not be found.`, error.message);
        }

        assert(didThrow);

        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    async function happyPath() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const scopeId = '082bf691-5d4d-44b0-9b36-0e80d10b2b56';

        const scope = {
            type: 'scope',
            id: scopeId,
            accessTokens: [],
        };

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const dataStore = {
            fetch: sandbox.stub().returns(Promise.resolve(scope)),
            write: sandbox.stub().returns(Promise.resolve(true)),
        };

        const subject = new AdminRPCTarget({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;

        const result = await subject.createScopedToken({ scopeId });

        assertEqual(1, dataStore.write.callCount);
        const newScope = dataStore.write.firstCall.args[0];
        assertEqual(scopeId, newScope.id);
        assert(Array.isArray(newScope.accessTokens));
        assertEqual(1, newScope.accessTokens.length);
        assert(isNonEmptyString(newScope.accessTokens[0]));

        assertEqual(scopeId, result.scopeId);
        assert(Array.isArray(result.accessTokens));
        assertEqual(1, result.accessTokens.length);
        assertEqual(newScope.accessTokens[0], result.accessTokens[0]);


        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    async function withExistingAccessTokens() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const scopeId = '082bf691-5d4d-44b0-9b36-0e80d10b2b56';

        const scope = {
            type: 'scope',
            id: scopeId,
            accessTokens: [ '405a3a90-e2e8-414b-929f-9849160852c7' ],
        };

        const fakeLoggerWrapper = new FakeLoggerWrapper();

        const dataStore = {
            fetch: sandbox.stub().returns(Promise.resolve(scope)),
            write: sandbox.stub().returns(Promise.resolve(true)),
        };

        const subject = new AdminRPCTarget({
            logger: fakeLoggerWrapper,
            dataStore,
        });

        const { logger } = fakeLoggerWrapper;

        const result = await subject.createScopedToken({ scopeId });

        assertEqual(1, dataStore.write.callCount);
        const newScope = dataStore.write.firstCall.args[0];
        assertEqual(scopeId, newScope.id);
        assert(Array.isArray(newScope.accessTokens));
        assertEqual(2, newScope.accessTokens.length);
        assertEqual(scope.accessTokens[0], newScope.accessTokens[0]);
        assert(isNonEmptyString(newScope.accessTokens[1]));

        assertEqual(scopeId, result.scopeId);
        assert(Array.isArray(result.accessTokens));
        assertEqual(2, result.accessTokens.length);
        assertEqual(scope.accessTokens[0], result.accessTokens[0]);
        assertEqual(newScope.accessTokens[1], result.accessTokens[1]);


        // Establish a habit of cleaning up the stub sandbox.
        logger.dispose();
        sandbox.reset();
        sandbox.restore();
    }

    await withInvalidParamsObject();
    await withInvalidScopeId();
    await scopeNotFound();
    await happyPath();
    await withExistingAccessTokens();
}

