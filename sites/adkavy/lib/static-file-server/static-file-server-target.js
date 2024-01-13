import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import Kixx from '../../kixx/mod.js';
import { KixxAssert } from '../../dependencies.js';

const { Target } = Kixx.Targets;
const { BadRequestError, NotFoundError, OperationalError } = Kixx.Errors;
const { getContentTypeForFileExtension } = Kixx.HTTP;
const { isValidDate } = KixxAssert;


// eslint-disable-next-line no-useless-escape
const DISALLOWED_STATIC_PATH_CHARACTERS = /[^a-z0-9_\.\-]/i;


export default class StaticFileServerTarget extends Target {

    #logger = null;
    #rootPath = null;
    #cacheControl = null;

    constructor(options) {
        const {
            name,
            methods,
            logger,
            rootPath,
            cacheControl,
        } = options;

        super({ name, methods });

        this.#logger = logger;
        this.#rootPath = rootPath;
        this.#cacheControl = cacheControl;
    }

    async handleRequest(request, response) {
        const { method } = request;
        const { pathname } = request.url;

        // Two dots or two slashes are always invalid
        if (pathname.includes('..') || pathname.includes('//')) {
            throw new BadRequestError(`Invalid static file path: ${ pathname }`);
        }

        const lastSlashIndex = pathname.lastIndexOf('/');
        const dotIndex = pathname.indexOf('.');

        // Dots are only valid if they are in the filename; after the last slash.
        if (dotIndex !== -1 && dotIndex < lastSlashIndex) {
            throw new BadRequestError(`Invalid static file path: ${ pathname }`);
        }

        const parts = pathname.split('/');

        for (let i = 0; i < parts.length; i = i + 1) {
            const part = parts[i];

            // In addition to the list, a single dot as a path part is invalid.
            if (DISALLOWED_STATIC_PATH_CHARACTERS.test(part) || part === '.') {
                throw new BadRequestError(`Invalid static file path: ${ pathname }`);
            }
        }

        const filepath = path.join(this.#rootPath, ...parts);

        this.#logger.debug('serving file', { pathname, filepath });

        let stat;

        try {
            stat = await fsp.stat(filepath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new NotFoundError(`Location not found: ${ pathname }`);
            }

            throw new OperationalError('Unable to stat file in static file handler', { error });
        }

        if (!stat.isFile()) {
            throw new NotFoundError(`Location not found: ${ pathname }`);
        }

        const modifiedDate = stat.mtime;

        response.headers.set('last-modified', modifiedDate.toUTCString());

        if (this.#cacheControl) {
            response.headers.set('cache-control', this.#cacheControl);
        }

        // Check for a conditional request.
        const ifModifiedSince = request.headers.get('if-modified-since');

        if (ifModifiedSince) {
            const ifModifiedSinceDate = new Date(ifModifiedSince);

            if (isValidDate(ifModifiedSinceDate) && (modifiedDate.getTime() > ifModifiedSinceDate.getTime())) {
                this.#logger.debug('conditional request satisfied', { pathname, filepath, ifModifiedSince });

                return response.respondNotModified();
            }
        }

        const extname = path.extname(filepath).replace(/^./, '');
        const contentType = getContentTypeForFileExtension(extname) || 'application/octet-stream';

        response.headers.set('content-length', stat.size);
        response.headers.set('content-type', contentType);

        const readStream = method === 'HEAD' ? null : fs.createReadStream(filepath);
        return response.respondWithStream(200, readStream);
    }

    handleError(error, request, response) {
        const { method } = request;
        const head = method === 'HEAD';

        switch (error.code) {
            case BadRequestError.CODE:
                return response.respondWithPlainText(400, error.message + '\n', { head });
            case NotFoundError.CODE:
                return response.respondWithPlainText(404, error.message + '\n', { head });
            default:
                return response.respondWithPlainText(500, 'Internal server error\n', { head });
        }
    }
}
