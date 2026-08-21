const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'ads-consent.js'), 'utf8');
const pages = ['index.html', 'about.html', 'guide.html', 'contact.html', 'privacy.html', 'terms.html'];

for (const fileName of pages) {
    const html = fs.readFileSync(path.join(root, fileName), 'utf8');
    if (!html.includes('data-google-privacy-settings') || !html.includes('ads-consent.js')) {
        throw new Error(`${fileName}: Google privacy settings control is not connected`);
    }
}

const allProjectHtml = pages.map((fileName) => fs.readFileSync(path.join(root, fileName), 'utf8')).join('\n');
if (/ca-pub-|pagead2\.googlesyndication\.com|adsbygoogle/i.test(allProjectHtml)) {
    throw new Error('An AdSense publisher tag was added before a publisher ID was configured');
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
