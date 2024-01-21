const matcher = /T([\d]{2}):([\d]{2})/;

exports.helper = function locale_time(str) {
    str = str || '';

    // Will convert an ISO formatted datetime string with consideration of the timezone :D
    // Ex: 2023-12-31T11:40:00-05:00
    const match = matcher.exec(str);

    if (match) {
        let hour = parseInt(match[1], 10) || 99;
        const min = match[2];

        let postfix = 'AM';
        if (hour >= 12) {
            postfix = 'PM';
        }

        if (hour === 0) {
            hour = 12;
        } else if (hour > 12) {
            hour = hour - 12;
        }

        return `${ hour }:${ min } ${ postfix }`;
    }

    return str;
};
