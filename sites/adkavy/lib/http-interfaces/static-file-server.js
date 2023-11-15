import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { KixxAssert } from '../../dependencies.js';
import {
    BadRequestError,
    NotFoundError,
    OperationalError
} from '../errors.js';
import { getContentTypeForFileExtension } from '../utils.js';

const { isNonEmptyString, isValidDate } = KixxAssert;


// eslint-disable-next-line no-useless-escape
const DISALLOWED_STATIC_PATH_CHARACTERS = /[^a-z0-9_\.\-]/i;


function filterEmpty(x) {
    return Boolean(x);
}


export default class StaticFileServer {

    #logger = null;
    #publicDirectory = null;

    constructor({ logger, publicDirectory }) {
        this.#logger = logger.createChild({ name: 'StaticFileServer' });
        this.#publicDirectory = publicDirectory;
    }

    handleError(error, request, response) {
        const { requestId } = request;

        switch (error.code) {
            case BadRequestError.CODE:
                return response.respondWithPlainText(400, error.message + '\n');
            case NotFoundError.CODE:
                return response.respondWithPlainText(404, error.message + '\n');
            default:
                this.#logger.error('caught error', { requestId, error });
                return response.respondWithPlainText(500, 'Internal server error\n');
        }
    }

    async serveFile(request, response, options) {
        const { folder, cacheControl } = options;

        let rootPath = this.#publicDirectory;

        if (isNonEmptyString(folder)) {
            const pathParts = folder.split('/').filter(filterEmpty);

            // Use the provided folder name.
            rootPath = path.join(this.#publicDirectory, ...pathParts);
        }

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

        const filepath = path.join(rootPath, ...parts);

        this.#logger.log('serving file', {
            pathname,
            rootPath,
            filepath,
        });

        let stat;

        try {
            stat = await fsp.stat(filepath);
        } catch (cause) {
            if (cause.code === 'ENOENT') {
                throw new NotFoundError(`Location not found: ${ pathname }`);
            }

            throw new OperationalError('Unable to stat file from static file handler', { cause });
        }

        if (!stat.isFile()) {
            throw new NotFoundError(`Location not found: ${ pathname }`);
        }

        const modifiedDate = stat.mtime;
        const ifModifiedSince = request.headers.get('if-modified-since');

        // Check for a conditional request.
        if (ifModifiedSince) {
            const ifModifiedSinceDate = new Date(ifModifiedSince);

            if (isValidDate(ifModifiedSinceDate) && (modifiedDate.getTime() > ifModifiedSinceDate.getTime())) {
                this.#logger.log('conditional request satisfied', { pathname, filepath, ifModifiedSince });

                response.headers.set('last-modified', modifiedDate.toUTCString());

                if (cacheControl) {
                    response.headers.set('cache-control', cacheControl);
                }

                return response.respondNotModified();
            }
        }

        const extname = path.extname(filepath).replace(/^./, '');
        const contentType = getContentTypeForFileExtension(extname) || 'application/octet-stream';

        response.headers.set('content-length', stat.size);
        response.headers.set('content-type', contentType);
        response.headers.set('last-modified', modifiedDate.toUTCString());

        if (cacheControl) {
            response.headers.set('cache-control', cacheControl);
        }

        if (request.method === 'HEAD') {
            return response.respondWithStream(200, null);
        }

        const readStream = fs.createReadStream(filepath);
        return response.respondWithStream(200, readStream);
    }
}
