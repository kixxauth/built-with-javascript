export default class Database {
    initialize() {
    }

    async #visitDirectory(context, rootPath, dirPath) {
        // Make a deep copy of the context object.
        // We will mutate the context object for this data node, but
        // DO NOT want to impact parent nodes.
        const thisContext = structuredClone(context);

        const { directories, files } = this.#listDirectory(dirPath);

        // Does this directory have a page file?
        let pageFile;
        // Does this directory have an index file?
        let indexFile;
        // Does this directory have a directory file?
        let directoryFile;

        files.forEach((fpath) => {
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
        thisContext.metadata = await this.#computePageMetadata(thisContext);
    }

    async #readDataFile(filepath) {
        const mod = await import(filepath);
        return mod.default;
    }
}
