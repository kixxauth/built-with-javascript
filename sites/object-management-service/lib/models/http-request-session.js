import { KixxAssert } from '../../dependencies.js';
import { UnauthorizedError, ForbiddenError } from '../errors.js';
import User from './user.js';
import Scope from './scope.js';


const { isNonEmptyString, assert } = KixxAssert;


export default class HTTPRequestSession {

    #dataStore = null;
    #request = null;

    constructor({ dataStore, request }) {
        this.#dataStore = dataStore;
        this.#request = request;
    }

    /**
     * @public
     */
    async getUserAndScope(scopeId) {
        // Will throw UnauthorizedError if the token does not exist.
        const token = this.#getAuthorizationToken();

        let user = new User({ id: token });
        let scope;

        const scopeRequired = isNonEmptyString(scopeId);

        if (scopeRequired) {
            scope = new Scope({ id: scopeId });
            [ user, scope ] = await this.#dataStore.fetchBatch([ user, scope ]);
        } else {
            user = await this.#dataStore.fetch(user);
        }

        if (!user) {
            throw new UnauthorizedError('user does not exist for given token');
        }

        if (scopeRequired && !scope) {
            throw new ForbiddenError('the requested user scope does not exist');
        }

        return [ user, scope ];
    }

    /**
     * @public
     */
    async getAdminUser() {
        const [ user ] = await this.getUserAndScope();

        if (!user.isAdminUser()) {
            throw new ForbiddenError('user must have admin privileges');
        }

        return user;
    }

    /**
     * @public
     */
    async getScopedUser(scopeId) {
        assert(isNonEmptyString(scopeId), ': A non empty string is required as scopeId');

        // Will throw UnauthorizedError if the token does not exist.
        const token = this.#getAuthorizationToken();
        const user = new User({ id: token });

        let scope = new Scope({ id: scopeId });
        scope = await this.#dataStore.fetch(scope);

        if (!scope) {
            throw new ForbiddenError('the requested user scope does not exist');
        }

        if (!scope.isUserAuthorized(user)) {
            throw new ForbiddenError('User is not authorized on requested scope');
        }

        return user.setScope(scope);
    }

    /**
     * @private
     */
    #getAuthorizationToken() {
        const authHeader = this.#request.headers.get('authorization');

        if (!isNonEmptyString(authHeader)) {
            throw new UnauthorizedError('missing authorization header');
        }

        return authHeader.replace(/^bearer[\s]*/i, '');
    }
}
