import { createLogger } from '../lib/logger.js';

export class FakeLoggerWrapper {
    logger = null;

    createChild() {
        this.logger = createLogger({
            name: 'FAKE_LOGGER',
            level: 'debug',
            makePretty: false,
        });

        return this.logger;
    }
}
