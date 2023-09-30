import sinon from 'sinon';
import HTTPRequestSession from '../../lib/models/http-request-session.js';
import User from '../../lib/models/user.js';
import Scope from '../../lib/models/scope.js';
import { UnauthorizedError, ForbiddenError } from '../../lib/errors.js';
import { KixxAssert } from '../../dependencies.js';


const { assert, assertEqual } = KixxAssert;


export default async function test_getUserAndScope() {

    async function getUser_missingAuthHeader() {
        const headers = new Headers();
        const request = { headers };
        const dataStore = {};

        const session = new HTTPRequestSession({ dataStore, request });

        let didThrow = false;
        try {
            await session.getUserAndScope();
        } catch (error) {
            didThrow = true;
            assert(
                error instanceof UnauthorizedError,
                ': Expected error to be an UnauthorizedError'
            );
        }

        assert(didThrow, ': session.getUserAndScope() expected to throw an error');
    }

    async function getUser_missingUser() {
        const token = '57e897f8-3b81-4cde-92c0-66d619b44663';

        const headers = new Headers({
            authorization: `Bearer ${ token }`,
        });

        const request = { headers };

        const dataStore = {
            fetch() {
                return null;
            },
        };

        const session = new HTTPRequestSession({ dataStore, request });

        let didThrow = false;
        try {
            await session.getUserAndScope();
        } catch (error) {
            didThrow = true;
            assert(
                error instanceof UnauthorizedError,
                ': Expected error to be an UnauthorizedError'
            );
        }

        assert(didThrow, ': session.getUserAndScope() expected to throw an error');
    }

    async function getUser_happyPathForUser() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const token = '57e897f8-3b81-4cde-92c0-66d619b44663';

        const headers = new Headers({
            authorization: `Bearer ${ token }`,
        });

        const request = { headers };

        const dataStore = {
            fetch: sandbox.stub().returns(Promise.resolve(new User({
                id: token,
            }))),
        };

        const session = new HTTPRequestSession({ dataStore, request });

        const [ user ] = await session.getUserAndScope();

        assertEqual(1, dataStore.fetch.callCount);

        const { args } = dataStore.fetch.firstCall;

        assertEqual('user', args[0].type);
        assertEqual(token, args[0].id);

        assert(user instanceof User, 'expected user to be an instanceof User');
        assertEqual(token, user.id);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    async function getUser_requiredScopeDoesNotExist() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const token = '57e897f8-3b81-4cde-92c0-66d619b44663';
        const scopeId = 'd96bda74-1fb4-4846-8ffe-a9d52e16565a';

        const headers = new Headers({
            authorization: `Bearer ${ token }`,
        });

        const request = { headers };

        const dataStore = {
            fetchBatch: sandbox.stub().returns(Promise.resolve([
                new User({ id: token }),
                null,
            ])),
        };

        const session = new HTTPRequestSession({ dataStore, request });

        let didThrow = false;
        try {
            await session.getUserAndScope(scopeId);
        } catch (error) {
            didThrow = true;
            assert(
                error instanceof ForbiddenError,
                ': Expected error to be a ForbiddenError'
            );
        }

        assert(didThrow);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    async function getUser_happyPathForUserAndScope() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const token = '57e897f8-3b81-4cde-92c0-66d619b44663';
        const scopeId = 'd96bda74-1fb4-4846-8ffe-a9d52e16565a';

        const headers = new Headers({
            authorization: `Bearer ${ token }`,
        });

        const request = { headers };

        const dataStore = {
            fetchBatch: sandbox.stub().returns(Promise.resolve([
                new User({ id: token }),
                new Scope({ id: scopeId }),
            ])),
        };

        const session = new HTTPRequestSession({ dataStore, request });

        const [ user, scope ] = await session.getUserAndScope(scopeId);

        assertEqual(1, dataStore.fetchBatch.callCount);

        let { args } = dataStore.fetchBatch.firstCall;

        assertEqual(Array.isArray(args[0]));
        args = args[0];

        assertEqual('user', args[0].type);
        assertEqual(token, args[0].id);
        assertEqual('scope', args[1].type);
        assertEqual(scopeId, args[1].id);

        assert(user instanceof User, 'expected user to be an instanceof User');
        assertEqual(token, user.id);

        assert(scope instanceof Scope, 'expected scope to be an instanceof Scope');
        assertEqual(scopeId, scope.id);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    await getUser_missingAuthHeader();
    await getUser_missingUser();
    await getUser_happyPathForUser();
    await getUser_requiredScopeDoesNotExist();
    await getUser_happyPathForUserAndScope();
}
