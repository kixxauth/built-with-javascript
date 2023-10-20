export function fromFileUrl(url) {
    return decodeURIComponent(
        url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, '%25')
    );
}
