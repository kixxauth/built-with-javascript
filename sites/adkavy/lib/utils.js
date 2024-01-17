
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
        .replace(/[^\w\-\.]+/g, '-')     // Replace all non-word chars (allow "-" and ".")
        // .replace(/\_/g, '-')          // Replace _ with - (No, allow "_")
        .replace(/\-\-+/g, '-')          // Replace multiple - with single -
        .replace(/\-$/g, '');            // Remove trailing -
    /* eslint-enable no-multi-spaces,no-useless-escape */
}
