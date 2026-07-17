function publicBaseUrl() {
    return String(
        process.env.PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.URL ||
        'https://foundersvn.com'
    ).replace(/\/+$/, '');
}

function absoluteUrl(path = '/') {
    if (/^https?:\/\//i.test(String(path))) return String(path);
    return `${publicBaseUrl()}${String(path).startsWith('/') ? '' : '/'}${path}`;
}

module.exports = { publicBaseUrl, absoluteUrl };
