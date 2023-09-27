import { KixxAssert } from '../../dependencies.js';
import { UnauthorizedError, ForbiddenError } from '../errors.js';
import User from './user.js';


const { isNonEmptyString } = KixxAssert;


export default class HTTPRequestSession {

    #dataStore = null;
    #request = null;

    constructor({ dataStore, request }) {
        this.#dataStore = dataStore;
        this.#request = request;
    }

    async getUser() {
        const authHeader = this.#request.headers.get('authorization');

        if (!isNonEmptyString(authHeader)) {
            throw new UnauthorizedError('missing authorization header');
        }

        const token = authHeader.replace(/^bearer[\s]*/i, '');

        const user = await User.fetch(this.#dataStore, token);

        if (!user) {
            throw new UnauthorizedError('user does not exist for given token');
        }

        return user;
    }

    async getAdminUser() {
        const user = await this.getUser();

        if (!user.isAdminUser()) {
            throw new ForbiddenError('user must have admin privileges');
        }

        return user;
    }
}
