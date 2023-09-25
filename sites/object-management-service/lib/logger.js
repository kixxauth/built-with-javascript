import { Logger } from 'kixx-logger';
import { getFullStackTrace } from './errors.js';


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
                const stack = getFullStackTrace(error).split('\n');

                return {
                    name: error.name || 'NO_NAME',
                    code: error.code || 'NO_CODE',
                    message: error.message || 'NO_MESSAGE',
                    stack,
                };
            },
        },
    });
}
