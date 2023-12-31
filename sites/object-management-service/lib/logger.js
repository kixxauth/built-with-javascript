import { Logger, streams } from 'kixx-logger';
import { getFullStack } from './errors.js';


export function createLogger({ name, level, makePretty }) {
    const stream = streams.JsonStdout.create({ makePretty });

    return Logger.create({
        name,
        level,
        stream,
        serializers: {
            error(error) {
                const stack = getFullStack(error).split('\n');

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
