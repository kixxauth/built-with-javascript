import { KixxAssert } from '../../dependencies.js';

const { assert, isNonEmptyString } = KixxAssert;


export default class Target {

    constructor({ name, methods }) {
        // TODO: Accept a prop called allowUnencrypted which is false by default.
        assert(isNonEmptyString(name), 'Target name is required');
        assert(Array.isArray(methods));

        Object.defineProperties(this, {
            name: {
                enumerable: true,
                value: name,
            },
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
