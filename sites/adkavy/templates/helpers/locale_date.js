const matcher = /^([\d]{4})-([\d]{2})-([\d]{2})T/;

exports.helper = function locale_date(str) {
    str = str || '';

    const match = matcher.exec(str);

    if (match) {
        const year = match[1];
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        return `${ month }/${ day }/${ year }`;
    }

    return str;
};
