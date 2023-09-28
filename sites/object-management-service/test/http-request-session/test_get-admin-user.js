import sinon from 'sinon';
import HTTPRequestSession from '../../lib/models/http-request-session.js';
import User from '../../lib/models/user.js';
import { UnauthorizedError, ForbiddenError } from '../../lib/errors.js';
import { KixxAssert } from '../../dependencies.js';


const { assert, assertEqual } = KixxAssert;


export default async function test_getAdminUser() {

    async function getAdminUser_missingAuthHeader() {
        const headers = new Headers();
        const request = { headers };
        const dataStore = {};

        const session = new HTTPRequestSession({ dataStore, request });

        let didThrow = false;
        try {
            await session.getAdminUser();
        } catch (error) {
            didThrow = true;
            assert(
                error instanceof UnauthorizedError,
                ': Expected error to be an UnauthorizedError'
            );
        }

        assert(didThrow, ': session.getUser() expected to throw an error');
    }

    async function getAdminUser_missingUser() {
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
            await session.getAdminUser();
        } catch (error) {
            didThrow = true;
            assert(
                error instanceof UnauthorizedError,
                ': Expected error to be an UnauthorizedError'
            );
        }

        assert(didThrow, ': session.getUser() expected to throw an error');
    }

    async function getAdminUser_notAdminUser() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const token = '57e897f8-3b81-4cde-92c0-66d619b44663';

        const headers = new Headers({
            authorization: `Bearer ${ token }`,
        });

        const request = { headers };

        const dataStore = {
            fetch: sandbox.stub().returns(Promise.resolve({
                id: token,
            })),
        };

        const session = new HTTPRequestSession({ dataStore, request });

        let didThrow = false;
        try {
            await session.getAdminUser();
        } catch (error) {
            didThrow = true;
            assert(
                error instanceof ForbiddenError,
                ': Expected error to be an ForbiddenError'
            );
        }

        assert(didThrow, ': session.getUser() expected to throw an error');

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    async function getAdminUser_happyPath() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const token = '57e897f8-3b81-4cde-92c0-66d619b44663';

        const headers = new Headers({
            authorization: `Bearer ${ token }`,
        });

        const request = { headers };

        const dataStore = {
            fetch: sandbox.stub().returns(Promise.resolve({
                id: token,
                groups: [ 'admin' ],
            })),
        };

        const session = new HTTPRequestSession({ dataStore, request });

        const user = await session.getAdminUser();

        assertEqual(1, dataStore.fetch.callCount);

        const { args } = dataStore.fetch.firstCall;

        assertEqual('user', args[0]);
        assertEqual(token, args[1]);

        assert(user instanceof User, 'expected user to be an instanceof User');
        assertEqual(token, user.id);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    await getAdminUser_missingAuthHeader();
    await getAdminUser_missingUser();
    await getAdminUser_notAdminUser();
    await getAdminUser_happyPath();
}
