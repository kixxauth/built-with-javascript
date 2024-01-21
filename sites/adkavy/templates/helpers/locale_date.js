const matcher = /^([\d]{4})-([\d]{2})-([\d]{2})T/;

exports.helper = function locale_date(str) {
    str = str || '';

    // Will convert an ISO formatted datetime string with consideration of the timezone :D
    // Ex: 2023-12-31T11:40:00-05:00
    const match = matcher.exec(str);

    if (match) {
        const year = match[1];
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        return `${ month }/${ day }/${ year }`;
    }

    return str;
};
