import { KixxAssert } from '../dependencies.js';
import { UnauthorizedError } from './errors.js';
import User from './models/user.js';


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

        const userData = await this.#dataStore.fetch('user', token);

        if (!userData) {
            throw new UnauthorizedError('user does not exist for given token');
        }

        return new User(userData);
    }
}
