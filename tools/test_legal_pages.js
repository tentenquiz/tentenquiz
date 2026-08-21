const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const index = read('index.html');
const about = read('about.html');
const guide = read('guide.html');
const contact = read('contact.html');
const privacy = read('privacy.html');
const terms = read('terms.html');
const legalCss = read('legal.css');
const i18n = read('i18n.js');

assert(!/<footer class="site-footer"[^>]*\bhidden\b/i.test(index), 'legal footer must be visible');
assert(/href="about\.html"/.test(index), 'index footer must link to about.html');
assert(/href="guide\.html"/.test(index), 'index footer must link to guide.html');
assert(/href="contact\.html"/.test(index), 'index footer must link to contact.html');
assert(/href="privacy\.html"/.test(index), 'index footer must link to privacy.html');
assert(/href="terms\.html"/.test(index), 'index footer must link to terms.html');
assert(/data-i18n="aboutSite"/.test(index), 'about footer label must be localized');
assert(/data-i18n="learningGuide"/.test(index), 'learning guide footer label must be localized');
assert(/data-i18n="contactSupport"/.test(index), 'contact footer label must be localized');
assert(/data-i18n="termsOfService"/.test(index), 'terms footer label must be localized');
assert((i18n.match(/aboutSite:/g) || []).length === 12, 'about footer label must exist in all 12 interface languages');
assert((i18n.match(/learningGuide:/g) || []).length === 12, 'learning guide footer label must exist in all 12 interface languages');
assert((i18n.match(/contactSupport:/g) || []).length === 12, 'contact footer label must exist in all 12 interface languages');
assert((i18n.match(/termsOfService:/g) || []).length === 12, 'terms footer label must exist in all 12 interface languages');

const aboutRequirements = [
    '<html lang="ko">',
    '<h1 id="about-tentenquiz-title">텐텐퀴즈 소개</h1>',
    '12개 언어',
    '2,500개의 핵심 생활 개념',
    '10개 스테이지',
    '주제별 25문제',
    '오답 클리어하기',
    '내 단어장',
    '회원가입',
    'support@tentenquiz.com',
    'href="privacy.html"',
    'https://tentenquiz.com/about.html'
];
aboutRequirements.forEach((text) => assert(about.includes(text), `about.html is missing: ${text}`));

const guideRequirements = [
    '<html lang="ko">',
    '<h1 id="learning-guide-title">텐텐퀴즈 학습 안내</h1>',
    '10개 스테이지 × 10개 생활 주제 × 주제별 25개 어휘',
    '2,500개의 생활 어휘 개념',
    '자연 / 날씨',
    '오답 클리어하기 사용법',
    '내 단어장 사용법',
    '학습 기록은 어디에 저장되나요?',
    '자주 묻는 질문',
    'support@tentenquiz.com',
    'https://tentenquiz.com/guide.html'
];
guideRequirements.forEach((text) => assert(guide.includes(text), `guide.html is missing: ${text}`));

const contactRequirements = [
    '<html lang="ko">',
    '<h1 id="contact-support-title">문의·도움말</h1>',
    'mailto:support@tentenquiz.com',
    '번역·뜻',
    '발음·음성',
    '기능 오류',
    '학습 기록·복구',
    '복구 코드 전체를 이메일로 보내지 마세요',
    '만 13세 미만',
    'href="privacy.html"',
    'https://tentenquiz.com/contact.html'
];
contactRequirements.forEach((text) => assert(contact.includes(text), `contact.html is missing: ${text}`));

const privacyRequirements = [
    '<html lang="ko">',
    '<h1 id="privacy-policy-title">개인정보처리방침</h1>',
    'Google을 포함한 제3자 공급업체',
    '이전 방문 기록을 기반으로 광고를 게재',
    'https://adssettings.google.com/',
    '만 13세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다',
    'support@tentenquiz.com',
    '로컬 저장소 또는 IndexedDB',
    'https://tentenquiz.com/privacy.html'
];
privacyRequirements.forEach((text) => assert(privacy.includes(text), `privacy.html is missing: ${text}`));

const termsRequirements = [
    '<html lang="ko">',
    '<h1 id="terms-of-service-title">이용약관</h1>',
    'href="privacy.html"',
    'Google AdSense',
    '만 13세 미만',
    'support@tentenquiz.com',
    'https://tentenquiz.com/terms.html'
];
termsRequirements.forEach((text) => assert(terms.includes(text), `terms.html is missing: ${text}`));

for (const [fileName, html] of [['about.html', about], ['guide.html', guide], ['contact.html', contact], ['privacy.html', privacy], ['terms.html', terms]]) {
    assert(/<meta name="description" content="[^"]+">/.test(html), `${fileName} needs a meta description`);
    assert(/<meta name="robots" content="index, follow">/.test(html), `${fileName} must be indexable`);
    assert((html.match(/<article\b/g) || []).length === (html.match(/<\/article>/g) || []).length, `${fileName} article tags are unbalanced`);
    assert((html.match(/<section\b/g) || []).length === (html.match(/<\/section>/g) || []).length, `${fileName} section tags are unbalanced`);

    for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
        const reference = match[1].split('?')[0];
        if (/^(?:https?:|mailto:|tel:|data:)/i.test(reference)) continue;
        assert(fs.existsSync(path.resolve(root, reference)), `${fileName} references missing local asset: ${reference}`);
    }
}

assert(legalCss.includes('@media (max-width: 600px)'), 'legal pages need mobile styles');
assert(legalCss.includes('@media print'), 'legal pages need print styles');

console.log('OK: Korean about, learning guide, contact, privacy policy, and terms pages are complete and linked');
console.log('OK: useful learning content, safe contact guidance, AdSense, child privacy, SEO, and mobile checks passed');
