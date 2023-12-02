
const MimeTypes = [
    {
        mimeType: 'application/json',
        pattern: /^application\/json/,
        fileExtensions: [ 'json', 'webmanifest' ],
    },
    {
        mimeType: 'application/xml',
        pattern: /^application\/xml/,
        fileExtensions: [ 'xml' ],
    },
    {
        mimeType: 'text/javascript',
        pattern: /^text\/javascript/,
        fileExtensions: [ 'js' ],
    },
    {
        mimeType: 'image/jpeg',
        pattern: /^image\/jpeg/,
        fileExtensions: [ 'jpg', 'jpeg' ],
    },
    {
        mimeType: 'image/png',
        pattern: /^image\/png/,
        fileExtensions: [ 'png' ],
    },
    {
        mimeType: 'image/svg+xml',
        pattern: /^image\/svg\+xml/,
        fileExtensions: [ 'svg' ],
    },
    {
        mimeType: 'image/x-icon',
        pattern: /^image\/x-icon/,
        fileExtensions: [ 'ico' ],
    },
    {
        mimeType: 'text/css',
        pattern: /^text\/css/,
        fileExtensions: [ 'css' ],
    },
];

const FileExtensionToContentType = new Map();

MimeTypes.forEach(({ mimeType, fileExtensions }) => {
    fileExtensions.forEach((extension) => {
        FileExtensionToContentType.set(extension, mimeType);
    });
});

export function getContentTypeForFileExtension(extname) {
    const key = extname.toLowerCase().replace(/^[.]+/, '');
    return FileExtensionToContentType.get(key);
}

export function getFileExtensionForContentType(contentType) {
    for (let i = 0; i < MimeTypes.length; i = i + 1) {
        const { pattern, fileExtensions } = MimeTypes[i];
        if (pattern.test(contentType)) {
            return `.${ fileExtensions[0] }`;
        }
    }

    return '';
}

export function fromFileUrl(url) {
    return decodeURIComponent(
        url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, '%25')
    );
}

export function compact(list) {
    return list.filter((x) => {
        return x;
    });
}

export function slugifyFilename(text) {
    /* eslint-disable no-multi-spaces,no-useless-escape */
    return text
        .toString()                      // Cast to string (optional)
        .normalize('NFKD')               // The normalize() using NFKD method returns the Unicode Normalization Form of a given string.
        .replace(/[\u0300-\u036f]/g, '') // Deletes all the accents, which happen to be all in the \u03xx UNICODE block
        .toLowerCase()                   // Convert the string to lowercase letters
        .trim()                          // Remove whitespace from both sides of a string (optional)
        .replace(/\s+/g, '-')            // Replace spaces with -
        .replace(/[^\w\-\.]+/g, '')      // Remove all non-word chars (allow "-" and ".")
        // .replace(/\_/g, '-')          // Replace _ with - (No, allow "_")
        .replace(/\-\-+/g, '-')          // Replace multiple - with single -
        .replace(/\-$/g, '');            // Remove trailing -
    /* eslint-enable no-multi-spaces,no-useless-escape */
}
