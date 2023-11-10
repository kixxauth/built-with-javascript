export default class Logger {

    constructor({ name }) {
        this.name = name;
    }

    /* eslint-disable no-console */
    debug(message, info) {
        console.log(this.#formatMessage('DEBUG', message, info));
    }

    log(message, info) {
        console.log(this.#formatMessage('INFO ', message, info));
    }

    info(message, info) {
        console.log(this.#formatMessage('INFO ', message, info));
    }

    warn(message, info) {
        console.log(this.#formatMessage('WARN ', message, info));
    }

    error(message, info) {
        console.log(this.#formatMessage('ERROR', message, info));
    }
    /* eslint-enable no-console */

    #formatMessage(level, msg, info) {
        const now = new Date();

        const data = {
            time: now.toISOString(),
            name: this.name,
            level,
            msg,
        };

        Object.assign(data, info);

        if (data.error) {
            data.error = this.#formatError(data.error);
        }

        return JSON.stringify(data);
    }

    #formatError(error) {
        return {
            name: error.name || 'NO_NAME',
            code: error.code || 'NO_CODE',
            message: error.message || 'NO_MESSAGE',
            stack: (error.stack || '').split('\n'),
        };
    }
}
