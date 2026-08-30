const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'ads-consent.js'), 'utf8');
const pages = ['index.html', 'about.html', 'guide.html', 'contact.html', 'privacy.html', 'terms.html'];
const locales = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'site.json'), 'utf8')).locales;
const publisherId = 'ca-pub-4712532452249773';
const expectedAccountMeta = `<meta name="google-adsense-account" content="${publisherId}">`;
const localizedPagePath = (locale, fileName) => fileName === 'index.html'
    ? path.join(locale, 'index.html')
    : path.join(locale, fileName.replace(/\.html$/i, ''), 'index.html');
const homePages = ['index.html', ...locales.map((locale) => path.join(locale, 'index.html'))];
const nonHomePages = [
    ...pages.slice(1),
    ...locales.flatMap((locale) => pages.slice(1).map((fileName) => localizedPagePath(locale, fileName)))
];
const publicPages = [...homePages, ...nonHomePages];

for (const fileName of pages) {
    const html = fs.readFileSync(path.join(root, fileName), 'utf8');
    if (!html.includes('data-google-privacy-settings') || !html.includes('ads-consent.js')) {
        throw new Error(`${fileName}: Google privacy settings control is not connected`);
    }
}

for (const fileName of homePages) {
    const html = fs.readFileSync(path.join(root, fileName), 'utf8');
    const accountTags = html.match(/<meta\b[^>]*name=["']google-adsense-account["'][^>]*>/gi) || [];
    if (accountTags.length !== 1 || accountTags[0] !== expectedAccountMeta) {
        throw new Error(`${fileName}: expected exactly one AdSense ownership meta for ${publisherId}`);
    }
}

for (const fileName of nonHomePages) {
    const html = fs.readFileSync(path.join(root, fileName), 'utf8');
    if (/name=["']google-adsense-account["']/i.test(html)) {
        throw new Error(`${fileName}: AdSense ownership meta must stay scoped to public home pages`);
    }
}

const allProjectHtml = publicPages.map((fileName) => fs.readFileSync(path.join(root, fileName), 'utf8')).join('\n');
if (/pagead2\.googlesyndication\.com|adsbygoogle|data-tenten-adsense/i.test(allProjectHtml)) {
    throw new Error('An AdSense advertising script was added during ownership verification');
}

function createControl() {
    return {
        hidden: false,
        listeners: {},
        addEventListener(type, listener) {
            this.listeners[type] = listener;
        }
    };
}

const control = createControl();
let revocationCalls = 0;
let tcfListener;
const context = {
    document: {
        querySelectorAll() {
            return [control];
        }
    },
    window: {
        googlefc: {
            callbackQueue: [],
            showRevocationMessage() {
                revocationCalls += 1;
            }
        },
        __tcfapi(command, version, listener) {
            if (command !== 'addEventListener' || version !== 0) {
                throw new Error('Unexpected TCF API call');
            }
            tcfListener = listener;
        }
    }
};

vm.runInNewContext(source, context, { filename: 'ads-consent.js' });

if (!control.hidden) throw new Error('Privacy settings must be hidden before the Google consent API is ready');
const readyEntry = context.window.googlefc.callbackQueue[0];
if (!readyEntry || typeof readyEntry.CONSENT_API_READY !== 'function') {
    throw new Error('CONSENT_API_READY callback was not registered');
}

readyEntry.CONSENT_API_READY();
tcfListener({ gdprApplies: false }, true);
if (!control.hidden) throw new Error('Privacy settings must stay hidden outside the applicable region');

tcfListener({ gdprApplies: true }, true);
if (control.hidden) throw new Error('Privacy settings must be visible when GDPR applies');

control.listeners.click();
if (revocationCalls !== 1) throw new Error('Privacy settings did not open the Google revocation message');

console.log('OK: Google CMP readiness, regional visibility, and consent revocation control passed');
