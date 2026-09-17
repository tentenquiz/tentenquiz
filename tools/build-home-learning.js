const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const copy = require('../locales/home-learning.json');

// 홈페이지에 있던 8단어 예시 카드는 /[locale]/words/ 사전이 같은 내용을
// 250개 단어 전체·실제 언어 상태 그대로 보여주므로 제거했습니다. 여기서는
// i18n.js 를 그대로 실행해 wordDictionaryLink 번역과
// renderHomeLearningParagraph({wordDictionaryLink} 토큰만 안전하게 <a> 로
// 치환하는 함수)를 가져옵니다 - 빌드 스크립트와 런타임(i18n.js 의
// syncHomeLearning)이 같은 치환 규칙을 공유합니다.
let cachedModule = null;
function loadI18nModule() {
    if (cachedModule) return cachedModule;
    const sandbox = { window: {}, console };
    sandbox.globalThis = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), sandbox, { filename: 'i18n.js' });
    cachedModule = sandbox.window;
    return cachedModule;
}

function renderHomeLearning(slug) {
    const t = copy[slug];
    if (!t || t.length < 3) throw new Error(`Missing home copy: ${slug}`);
    const lang = { 'zh-cn': 'zh-Hans', 'zh-tw': 'zh-Hant' }[slug] || slug;
    const localeCode = { 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW' }[slug] || slug;
    const i18nModule = loadI18nModule();
    const messages = i18nModule.TENTEN_I18N_MESSAGES;
    const renderParagraph = i18nModule.renderHomeLearningParagraph;
    const linkLabel = (messages[localeCode] && messages[localeCode].wordDictionaryLink) || messages.en.wordDictionaryLink;
    const linkHref = `/${slug}/words/`;
    return `<!-- home-learning:start -->
<section class="home-learning" lang="${lang}" dir="${slug === 'ar' ? 'rtl' : 'ltr'}" aria-labelledby="home-learning-title">
<h2 id="home-learning-title">${renderParagraph(t[0], linkHref, linkLabel)}</h2>
<p>${renderParagraph(t[1], linkHref, linkLabel)}</p>
<p>${renderParagraph(t[2], linkHref, linkLabel)}</p>
</section>
<!-- home-learning:end -->`;
}
function injectHomeLearning(html, slug) {
    const block = renderHomeLearning(slug);
    if (html.includes('<!-- home-learning:start -->')) return html.replace(/<!-- home-learning:start -->[\s\S]*?<!-- home-learning:end -->/, block);
    if (!html.includes('<footer class="site-footer">')) throw new Error('Missing home footer');
    return html.replace('<footer class="site-footer">', `${block}\n\n        <footer class="site-footer">`);
}
if (require.main === module) {
    for (const slug of ['', ...Object.keys(copy)]) {
        const file = path.join(root, slug, 'index.html');
        fs.writeFileSync(file, injectHomeLearning(fs.readFileSync(file, 'utf8'), slug || 'en'));
    }
}
module.exports = { injectHomeLearning, renderHomeLearning };
