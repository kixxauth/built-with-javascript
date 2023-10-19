exports.helper = function iso_date() {
    const date = new Date();
    const str = date.toISOString();
    return str.split('T')[0];
};
