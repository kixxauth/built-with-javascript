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

    async getUserAndScope(scopeId) {
        const authHeader = this.#request.headers.get('authorization');

        if (!isNonEmptyString(authHeader)) {
            throw new UnauthorizedError('missing authorization header');
        }

        const token = authHeader.replace(/^bearer[\s]*/i, '');

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

    async getAdminUser() {
        const [ user ] = await this.getUserAndScope();

        if (!user.isAdminUser()) {
            throw new ForbiddenError('user must have admin privileges');
        }

        return user;
    }

    async getScopedUser(scopeId) {
        assert(isNonEmptyString(scopeId), ': A non empty string is required as scopeId');

        const [ user, scope ] = await this.getUserAndScope(scopeId);

        if (!scope.isUserAuthorized(user)) {
            throw new ForbiddenError('User is not authorized on required scope');
        }

        return user.setScope(scope);
    }
}
