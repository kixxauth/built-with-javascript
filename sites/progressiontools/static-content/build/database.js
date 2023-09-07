import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';


export default class Database {

    #database = new Map();

    async initialize({ sourceDirectory }) {
        const rootFile = path.join(sourceDirectory, 'site.toml');
        const rootPath = path.join(sourceDirectory, 'site');

        const context = await this.#readDataFile(rootFile);

        await this.visitDirectory(context, rootPath, rootPath);

        return this;
    }

    async #visitDirectory(context, rootPath, dirPath) {
        // Make a deep copy of the context object.
        // We will mutate the context object for this data node, but
        // DO NOT want to impact parent nodes.
        const thisContext = structuredClone(context);

        const { directories, dataFiles } = this.#listDirectory(dirPath);

        // Does this directory have a page file?
        let pageFile;
        // Does this directory have an index file?
        let indexFile;
        // Does this directory have a directory file?
        let directoryFile;

        dataFiles.forEach((fpath) => {
            switch (path.basename(fpath)) {
                case 'page.js':
                    pageFile = fpath;
                    break;
                case 'index.js':
                    indexFile = fpath;
                    break;
                case 'directory.js':
                    directoryFile = fpath;
                    break;
            }
        });

        if (indexFile) {
            const newData = await this.#readDataFile(indexFile);

            Object.assign(thisContext, newData, {
                is_index: true,
                is_page: false,
            });

        // A directory cannot have both a page file and index file.
        } else if (pageFile) {
            const newData = await this.#readDataFile(pageFile);

            Object.assign(thisContext, newData, {
                is_index: false,
                is_page: true,
            });

        } else {
            thisContext.is_index = false;
            thisContext.is_page = false;
        }

        // Find the destination file path.
        const filePath = path.relative(rootPath, dirPath);

        // Normalize the relative file path into what will become the URL pathname to the file.
        let pathname = filePath.split(path.sep).join('/');

        // If this is an index page then the URL pathname will end in "/".
        if (thisContext.is_index) {
            pathname = `${ pathname }/`;
        }

        // Ensure the pathname always begins with a "/"
        if (!pathname.startsWith('/')) {
            pathname = `/${ pathname }`;
        }

        // If this is a named page or an index page then it will have a fully qualified URL.
        if (thisContext.is_index || thisContext.is_page) {
            thisContext.url = thisContext.hostname + pathname;
        }

        thisContext.dirPath = dirPath;
        thisContext.filePath = filePath;
        thisContext.pathname = pathname;

        this.#database.set(pathname, thisContext);

        // Make a deep copy of the context object to protect against
        // mutation and an unintended recursive reference structure.
        const nextContext = context;

        if (directoryFile) {
            const newData = await this.#readDataFile(directoryFile);

            Object.assign(nextContext, newData);
        }

        for (const dir of directories) {
            await this.#visitDirectory(nextContext, rootPath, dir);
        }

        return null;
    }

    async #listDirectory(dirpath) {
        const entries = await fsp.readdir(dirpath);

        const directories = [];
        const dataFiles = [];
        const contentFiles = [];

        entries.forEach((entry) => {
            const fullpath = path.join(dirpath, entry);
            const stat = fs.statSync(fullpath, { throwIfNoEntry: false });

            if (stat.isDirectory()) {
                directories.push(fullpath);
            } else if (stat.isFile()) {
                if (path.extname(entry) === '.js') {
                    dataFiles.push(fullpath);
                } else {
                    contentFiles.push(fullpath);
                }
            }
        });

        return { directories, dataFiles, contentFiles };
    }

    async #readDataFile(filepath) {
        const mod = await import(filepath);
        return mod.default;
    }
}
