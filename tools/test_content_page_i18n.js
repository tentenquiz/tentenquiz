const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const context = {};
vm.createContext(context);
vm.runInContext(read('content-translations.js'), context, { filename: 'content-translations.js' });

const content = context.TENTEN_CONTENT_TRANSLATIONS;
const languageCodes = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'fr', 'de', 'es', 'vi', 'ar', 'it', 'ru'];
const translatedCodes = languageCodes.filter((code) => code !== 'ko');
const pageRequirements = {
    about: 7,
    guide: 9,
    contact: 7,
    privacy: 10,
    terms: 11
};

assert(content && content.common && content.pages, 'translation bundle must expose common and pages');
assert(JSON.stringify(Object.keys(content.common)) === JSON.stringify(languageCodes), 'common navigation must preserve all 12 languages in order');
assert(content.languageNames.length === 12, 'language selector must list all 12 languages');
assert(new Set(content.languageNames.map((item) => item.code)).size === 12, 'language selector codes must be unique');

for (const code of languageCodes) {
    const common = content.common[code];
    ['home', 'about', 'guide', 'contact', 'privacy', 'terms', 'backToQuiz', 'brandHomeLabel', 'navigationLabel', 'languageLabel'].forEach((key) => {
        assert(String(common[key] || '').trim(), `${code} common label is missing: ${key}`);
    });
}

function assertBalanced(html, tag, label) {
    const opens = (html.match(new RegExp(`<${tag}(?:\\s|>)`, 'gi')) || []).length;
    const closes = (html.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
    assert(opens === closes, `${label} has unbalanced <${tag}> tags: ${opens}/${closes}`);
}

for (const code of translatedCodes) {
    const translatedPages = content.pages[code];
    assert(translatedPages, `${code} page collection is missing`);

    for (const [pageKey, sectionCount] of Object.entries(pageRequirements)) {
        const page = translatedPages[pageKey];
        assert(page, `${code}/${pageKey} translation is missing`);
        ['metaTitle', 'description', 'title', 'kicker', 'intro'].forEach((field) => {
            assert(String(page[field] || '').trim(), `${code}/${pageKey} is missing ${field}`);
        });
        assert(page.description.length >= 30, `${code}/${pageKey} meta description is too short`);
        assert(page.sections.length === sectionCount, `${code}/${pageKey} must have ${sectionCount} sections`);

        const combinedHtml = page.sections.map((section) => `${section.title}${section.html}`).join('');
        assert(!/_TRANSLATIONS|TODO|undefined/.test(combinedHtml), `${code}/${pageKey} contains a placeholder`);
        ['p', 'ul', 'ol', 'li', 'h3'].forEach((tag) => assertBalanced(combinedHtml, tag, `${code}/${pageKey}`));
    }

    assert(translatedPages.contact.sections.some((section) => section.html.includes('mailto:support@tentenquiz.com')), `${code} contact page needs the support email`);
    assert(translatedPages.privacy.sections.length === 10, `${code} privacy page needs all policy sections`);
    assert(translatedPages.privacy.sections.some((section) => section.html.includes('Google AdSense')), `${code} privacy page needs Google AdSense disclosure`);
    assert(translatedPages.privacy.sections.some((section) => section.html.includes('https://adssettings.google.com/')), `${code} privacy page needs Google ad settings`);
    assert(translatedPages.terms.sections.some((section) => section.html.includes('privacy.html')), `${code} terms page must link to privacy`);
}

for (const [pageKey, sectionCount] of Object.entries(pageRequirements)) {
    const fileName = pageKey === 'about' ? 'about.html'
        : pageKey === 'guide' ? 'guide.html'
            : pageKey === 'contact' ? 'contact.html'
                : `${pageKey}.html`;
    const html = read(fileName);
    assert(html.includes(`data-content-page="${pageKey}"`), `${fileName} must declare its content page key`);
    assert(html.includes('src="content-translations.js'), `${fileName} must load content translations`);
    assert(html.includes('src="content-pages.js'), `${fileName} must load the content-page runtime`);
    assert((html.match(/<section\b/g) || []).length >= sectionCount, `${fileName} must retain crawlable Korean content`);
}

const runtime = read('content-pages.js');
assert(runtime.includes("localStorage.getItem('tenten.interfaceLanguage')"), 'content pages must inherit the selected interface language');
assert(runtime.includes("language === 'ar' ? 'rtl' : 'ltr'"), 'Arabic content must use RTL layout');
assert(runtime.includes("url.searchParams.set('lang', language)"), 'internal content links must preserve page language');
assert(runtime.includes("url.searchParams.set('native', language)"), 'quiz return link must preserve the selected language');

console.log('OK: 5 complete content pages are available in all 12 supported languages');
console.log('OK: 11 translated page sets contain 484 required sections with no missing page');
console.log('OK: Korean crawlable originals, localized navigation, RTL, privacy, and support requirements passed');
