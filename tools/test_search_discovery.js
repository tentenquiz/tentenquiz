const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

const expectedPages = [
    ['index.html', 'https://tentenquiz.com/'],
    ['about.html', 'https://tentenquiz.com/about.html'],
    ['guide.html', 'https://tentenquiz.com/guide.html'],
    ['contact.html', 'https://tentenquiz.com/contact.html'],
    ['privacy.html', 'https://tentenquiz.com/privacy.html'],
    ['terms.html', 'https://tentenquiz.com/terms.html']
];

if (!/^User-agent:\s*\*$/m.test(robots) || !/^Allow:\s*\/$/m.test(robots)) {
    throw new Error('robots.txt does not allow the public site to be crawled');
}
if (!/^Sitemap:\s*https:\/\/tentenquiz\.com\/sitemap\.xml$/m.test(robots)) {
    throw new Error('robots.txt does not point to the canonical sitemap URL');
}
for (const privatePath of ['/backups/', '/tools/']) {
    if (!robots.includes(`Disallow: ${privatePath}`)) {
        throw new Error(`robots.txt does not exclude ${privatePath}`);
    }
}

if (!/<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"[^>]*>/.test(sitemap)) {
    throw new Error('sitemap.xml does not use the standard sitemap namespace');
}
if (!sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"')) {
    throw new Error('sitemap.xml does not declare multilingual XHTML links');
}

const locations = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]);
const siteConfig = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'site.json'), 'utf8'));
const localeSlugs = siteConfig.locales;
const expectedLocations = expectedPages.flatMap(([fileName, url]) => {
    const pageKey = fileName === 'index.html' ? '' : fileName.replace(/\.html$/, '');
    return [url, ...localeSlugs.map((slug) => (
        pageKey ? `https://tentenquiz.com/${slug}/${pageKey}/` : `https://tentenquiz.com/${slug}/`
    ))];
});
if (locations.length !== expectedLocations.length || expectedLocations.some((url) => !locations.includes(url))) {
    throw new Error(`Unexpected sitemap URLs: ${locations.join(', ')}`);
}
if (/backup|before-|[?&]lang=|[?&]native=/i.test(sitemap)) {
    throw new Error('The sitemap contains a backup or duplicate query URL');
}

for (const [fileName, canonicalUrl] of expectedPages) {
    const html = fs.readFileSync(path.join(root, fileName), 'utf8');
    if (!html.includes('<meta name="robots" content="index, follow">')) {
        throw new Error(`${fileName} is missing the index/follow directive`);
    }
    if (!html.includes(`<link rel="canonical" href="${canonicalUrl}">`)) {
        throw new Error(`${fileName} is missing its canonical URL`);
    }
}

const notFoundHtml = fs.readFileSync(path.join(root, '404.html'), 'utf8');
if (!notFoundHtml.includes('<meta name="robots" content="noindex, follow">')) {
    throw new Error('404.html must stay out of search results');
}
if (!notFoundHtml.includes("'zh-TW'") || !notFoundHtml.includes("ar: ['")) {
    throw new Error('404.html is missing multilingual or RTL support');
}

console.log(`OK: robots.txt and sitemap.xml expose ${expectedLocations.length} canonical multilingual public pages`);
