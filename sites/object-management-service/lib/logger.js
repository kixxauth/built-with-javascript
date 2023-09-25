import { Logger } from 'kixx-logger';

export function createLogger({ name, level }) {
    return Logger.create({
        name,
        level,
        serializers: {
            req(req) {
                return {
                    method: req.method,
                    url: req.url,
                    contentLength: req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0,
                };
            },
            error(error) {
                return {
                    name: error.name || 'NO_NAME',
                    code: error.code || 'NO_CODE',
                    message: error.message || 'NO_MESSAGE',
                    stack: error.stack ? error.stack.split('\n') : 'NO_STACK',
                };
            },
        },
    });
}
