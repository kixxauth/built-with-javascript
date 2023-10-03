import sinon from 'sinon';
import HTTPRequestSession from '../../lib/models/http-request-session.js';
import User from '../../lib/models/user.js';
import Scope from '../../lib/models/scope.js';
import { ForbiddenError } from '../../lib/errors.js';
import { KixxAssert } from '../../dependencies.js';


const { assert, assertEqual } = KixxAssert;


export default async function test_getScopedUser() {

    async function whenUserForbiddenForScope() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const token = '57e897f8-3b81-4cde-92c0-66d619b44663';
        const scopeId = 'd96bda74-1fb4-4846-8ffe-a9d52e16565a';

        const headers = new Headers({
            authorization: `Bearer ${ token }`,
        });

        const request = { headers };

        // The access token does not match the user token.
        const scope = new Scope({ id: scopeId, accessTokens: [ 'foo-bar-baz' ] });

        const dataStore = {
            fetch: sandbox.stub().returns(scope),
        };

        const session = new HTTPRequestSession({ dataStore, request });

        let didThrow = false;
        try {
            await session.getScopedUser(scopeId);
        } catch (error) {
            didThrow = true;
            assert(error instanceof ForbiddenError);
        }

        assert(didThrow);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    async function happyPath() {
        // Create a Sinon sandbox for stubs isolated to this test.
        const sandbox = sinon.createSandbox();

        const token = '57e897f8-3b81-4cde-92c0-66d619b44663';
        const scopeId = 'd96bda74-1fb4-4846-8ffe-a9d52e16565a';

        const headers = new Headers({
            authorization: `Bearer ${ token }`,
        });

        const request = { headers };

        // The access token does not match the user token.
        const scope = new Scope({ id: scopeId, accessTokens: [ token ] });

        const dataStore = {
            fetch: sandbox.stub().returns(scope),
        };

        const session = new HTTPRequestSession({ dataStore, request });

        const user = await session.getScopedUser(scopeId);

        assert(user instanceof User, 'expected user to be an instanceof User');
        assertEqual(token, user.id);

        assert(user.scope instanceof Scope, 'expected scope to be an instanceof Scope');
        assertEqual(scopeId, user.scope.id);

        // Establish a habit of cleaning up the stub sandbox.
        sandbox.reset();
        sandbox.restore();
    }

    await whenUserForbiddenForScope();
    await happyPath();
}
