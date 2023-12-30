export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const ISO_DATE_PATTERN = /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}.[\d]{3}Z$/;

export class FakeLoggerWrapper {
    logger = null;

    createChild() {
        this.logger = new FakeLogger();
        return this.logger;
    }
}

class FakeLogger {
    trace() {}
    debug() {}
    info() {}
    log() {}
    warn() {}
    error() {}
    dispose() {}
    createChild() {
        return new FakeLogger();
    }
}
