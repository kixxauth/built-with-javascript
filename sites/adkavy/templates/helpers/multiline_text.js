
exports.helper = function multiline_text(str) {
    str = str || '';

    const parts = str.split('\n').map((s) => {
        return s.trim();
    });

    const html = parts.join('</p><p>');

    // eslint-disable-next-line no-undef
    return new Handlebars.SafeString(`<p>${ html }</p>`);
};
