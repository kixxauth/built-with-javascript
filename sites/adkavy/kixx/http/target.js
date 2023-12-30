import { KixxAssert } from '../../dependencies.js';

const { assert } = KixxAssert;


export default class Target {

    constructor({ methods }) {
        assert(Array.isArray(methods));

        Object.defineProperties(this, {
            methods: {
                enumerable: true,
                // Make copies of Objects before we freeze them.
                value: Object.freeze(methods.slice()),
            },
        });
    }

    allowsMethod(method) {
        return this.methods.includes(method);
    }

    handleRequest(request, response) {
        return response.respondWithPlainText(501, 'Not implemented.\n');
    }

    handleError() {
        return false;
    }

}
