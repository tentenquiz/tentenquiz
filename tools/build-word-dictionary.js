// 단어 사전(글로서리) 정적 페이지 생성기.
// data/*.json 의 단어 데이터를 언어별/섹션별 정적 HTML로 펼쳐 애드센스·검색엔진
// 크롤러가 실제 텍스트 콘텐츠를 볼 수 있게 합니다. locales/word-dictionary.json 에
// 카피가 있는 언어만 생성합니다 (지금은 ko 파일럿).
//
// 실행: node tools/build-word-dictionary.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { injectStaticLocaleBootstrap } = require('./lib/static-locale-bootstrap');

const root = path.resolve(__dirname, '..');

const SECTIONS = [
    'people_relations', 'body_health', 'food_drink', 'home_daily_life', 'nature_weather',
    'activities_leisure', 'places_transport', 'school_work', 'shopping_money', 'time_calendar'
];

const escape = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const slugify = (key) => key.replace(/_/g, '-');

function loadBrowserGlobal(fileName, globalName) {
    const sandbox = { window: {}, console };
    sandbox.globalThis = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, fileName), 'utf8'), sandbox, { filename: fileName });
    const value = sandbox.window[globalName];
    if (!value) throw new Error(`${fileName} did not expose ${globalName}`);
    return value;
}

function loadWordData() {
    const bySection = {};
    for (const section of SECTIONS) {
        bySection[section] = JSON.parse(fs.readFileSync(path.join(root, 'data', `${section}.json`), 'utf8'));
    }
    return bySection;
}

// 정적 사전 페이지의 "기본 언어쌍"은 실제 앱(global-config.js)의 cold-start
// 기본값 규칙과 반드시 같아야 합니다. 그 규칙(영어 인터페이스는 스페인어를
// 기본 학습 언어로, 그 외에는 영어를 기본 학습 언어로 등)을 여기서 다시
// 베껴 쓰면 두 곳이 나중에 어긋날 수 있으므로, global-config.js 를 Node
// vm 샌드박스에서 그대로 실행해 window.resolveTentenLanguageState /
// window.resolveGlobalQuizItem 을 실제로 호출합니다. localStorage/쿼리/
// 브라우저 감지가 전부 없는 "완전 첫 방문" 상태를 흉내 내어, 이 locale의
// interfaceLanguage 만 고정해서 넘깁니다(그 외 우선순위 체인은 실제 코드가
// 그대로 판단합니다).
function loadTentenLanguageApi(interfaceLanguageCode) {
    const sandbox = {
        window: {
            location: { href: 'https://tentenquiz.com/' },
            __TENTEN_STATIC_INTERFACE_LANGUAGE__: interfaceLanguageCode
        },
        console,
        URL,
        localStorage: { getItem: () => null, setItem: () => {} },
        navigator: { languages: [], language: '' }
    };
    sandbox.globalThis = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(
        fs.readFileSync(path.join(root, 'global-config.js'), 'utf8'),
        sandbox,
        { filename: 'global-config.js' }
    );
    return sandbox.window;
}

// word/quizItem 의 언어 필드 선택(어느 필드가 표제어/뜻/발음인지, zh-TW
// 주음 처리 등)은 전부 resolveGlobalQuizItem(전달받은 quizItem)이 이미
// 계산해서 넘겨줍니다 - 여기서 그 규칙을 다시 구현하지 않습니다.
function buildWordCard(word, quizItem) {
    const { targetWord, targetReading, meaning, note, learningLanguage } = quizItem;
    if (!targetWord || !meaning || !note) throw new Error(`Missing fields for ${word.id} (${learningLanguage})`);
    const readingHtml = targetReading && targetReading !== targetWord
        ? `<p class="stage-preview-reading" lang="${learningLanguage}">${escape(targetReading)}</p>`
        : '';
    return `<div class="stage-preview-card" data-word-id="${escape(word.id)}"><p class="stage-preview-word" lang="${learningLanguage}">${escape(targetWord)}<span class="stage-preview-arrow">—</span>${escape(meaning)}</p>${readingHtml}<p class="stage-preview-note">${escape(note)}</p></div>`;
}

function buildStageBlock(stage, words, resolveItem, stageLabel) {
    const cards = words.filter((w) => w.stage === stage)
        .map((w) => buildWordCard(w, resolveItem(w)))
        .join('\n');
    return `<section class="word-dict-stage" id="stage-${stage}">
<h2 class="stage-preview-group-title">${escape(stageLabel.replace('{n}', String(stage)))}</h2>
<div class="stage-preview-grid">${cards}</div>
</section>`;
}

function faviconBlock() {
    return `    <link rel="icon" href="/favicon.ico?v=20260818-tq-1" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon/favicon-32x32.png?v=20260818-tq-1">
    <link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/favicon-180x180.png?v=20260818-tq-1">
    <link rel="stylesheet" href="/style.css?v=20260917-word-dict-restyle-1">`;
}

// about.html/guide.html 등 기존 페이지가 쓰는 hreflang 패턴(locale.hreflang +
// data-tenten-static-hreflang + x-default)을 그대로 재사용합니다. x-default는
// 이 사이트의 기존 정책("/ 은 영어 기본")을 그대로 따라 영어(en) 버전을 가리킵니다.
function buildAlternateLinksHtml(siteUrl, targetSlugs, localesBySlug, pathFor) {
    const links = targetSlugs.map((slug) => {
        const loc = localesBySlug[slug];
        return `    <link rel="alternate" hreflang="${escape(loc.hreflang)}" href="${escape(siteUrl + pathFor(slug))}" data-tenten-static-hreflang>`;
    });
    links.push(`    <link rel="alternate" hreflang="x-default" href="${escape(siteUrl + pathFor('en'))}" data-tenten-static-hreflang>`);
    return links.join('\n');
}

function buildSectionPage({ locale, sectionKey, words, copy, sectionLabel, brandLabel, backLabel, footerNav, pageUrl, siteUrl, alternateLinksHtml, languageApi }) {
    const resolvedState = languageApi.tentenGlobal;
    const title = `${sectionLabel} ${copy.titleSuffix} | TentenQuiz`;
    const sectionIntro = copy.sections[sectionKey] || '';
    const description = `${sectionLabel}: ${sectionIntro}`.slice(0, 160);
    const stageBlocks = Array.from({ length: 10 }, (_, i) => i + 1)
        .map((stage) => buildStageBlock(stage, words, languageApi.resolveGlobalQuizItem, copy.stageLabel))
        .join('\n');
    const quizHref = `/${locale.slug}/`;

    return `<!DOCTYPE html>
<html lang="${locale.htmlLang}" dir="${locale.dir}" translate="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#9F2F2F">
    <link rel="canonical" href="${escape(pageUrl)}">
${alternateLinksHtml}
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escape(title)}">
    <meta property="og:description" content="${escape(description)}">
    <meta property="og:url" content="${escape(pageUrl)}">
    <meta name="google" content="notranslate">
${faviconBlock()}
    <script src="/global-config.js?v=20260821-clean-share-url-1"></script>
</head>
<body>
    <div class="quiz-container word-dict-container">
        <a class="word-dict-brand" href="${quizHref}" aria-label="${escape(brandLabel)}">🙌 TentenQuiz</a>
        <article class="card word-dict-card" aria-labelledby="word-dict-title"
            data-word-dict-section="${escape(sectionKey)}"
            data-static-learning="${escape(resolvedState.learningLanguage)}"
            data-static-native="${escape(resolvedState.interfaceLanguage)}"
            data-static-chinese-reading="${escape(resolvedState.chineseReading)}">
            <h1 id="word-dict-title" class="word-dict-title">${escape(sectionLabel)} ${escape(copy.titleSuffix)}</h1>
            <p class="word-dict-intro">${escape(sectionIntro)} ${escape(copy.intro)}</p>
            <p class="word-dict-intro">${escape(copy.usage)}</p>
            <nav class="word-dict-toc" aria-label="${escape(copy.titleSuffix)}">
${Array.from({ length: 10 }, (_, i) => i + 1).map((stage) => `                <a href="#stage-${stage}">${escape(copy.stageLabel.replace('{n}', String(stage)))}</a>`).join('\n')}
            </nav>
${stageBlocks}
            <p class="word-dict-intro">${escape(copy.closing)}</p>
            <a class="word-dict-cta" href="${quizHref}">${escape(copy.backToQuizLabel)}</a>
        </article>
        <footer class="site-footer">
${footerNav.links.map((link) => `            <a href="${escape(link.href)}" class="site-footer-link">${escape(link.label)}</a>`).join('\n')}
        </footer>
    </div>
    <script src="/word-dictionary.js?v=20260917-word-dict-lang-fix-1"></script>
</body>
</html>
`;
}

function buildHubPage({ locale, copy, sectionLabels, footerNav, siteUrl, alternateLinksHtml }) {
    const title = `${copy.titleSuffix} | TentenQuiz`;
    const description = copy.intro.slice(0, 160);
    const pageUrl = `${siteUrl}/${locale.slug}/words/`;
    const items = SECTIONS.map((key) => (
        `                <a href="/${locale.slug}/words/${slugify(key)}/">${escape(sectionLabels[key])}</a>`
    )).join('\n');

    return `<!DOCTYPE html>
<html lang="${locale.htmlLang}" dir="${locale.dir}" translate="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#9F2F2F">
    <link rel="canonical" href="${escape(pageUrl)}">
${alternateLinksHtml}
    <meta name="google" content="notranslate">
${faviconBlock()}
    <script src="/global-config.js?v=20260821-clean-share-url-1"></script>
</head>
<body>
    <div class="quiz-container word-dict-container">
        <a class="word-dict-brand" href="/${locale.slug}/" aria-label="TentenQuiz">🙌 TentenQuiz</a>
        <article class="card word-dict-card" aria-labelledby="word-dict-hub-title">
            <h1 id="word-dict-hub-title" class="word-dict-title">${escape(copy.titleSuffix)}</h1>
            <p class="word-dict-intro">${escape(copy.intro)}</p>
            <p class="word-dict-intro">${escape(copy.usage)}</p>
            <nav class="word-dict-hub-list" aria-label="${escape(copy.titleSuffix)}">
${items}
            </nav>
        </article>
        <footer class="site-footer">
${footerNav.links.map((link) => `            <a href="${escape(link.href)}" class="site-footer-link">${escape(link.label)}</a>`).join('\n')}
        </footer>
    </div>
    <script src="/word-dictionary.js?v=20260917-word-dict-lang-fix-1"></script>
</body>
</html>
`;
}

function run() {
    const siteConfig = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'site.json'), 'utf8'));
    const wordDictionaryCopy = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'word-dictionary.json'), 'utf8'));
    const i18nMessages = loadBrowserGlobal('i18n.js', 'TENTEN_I18N_MESSAGES');
    const wordData = loadWordData();
    const siteUrl = siteConfig.baseUrl;

    const targetSlugs = siteConfig.locales.filter((slug) => wordDictionaryCopy[slug]);
    if (targetSlugs.length === 0) {
        console.log('locales/word-dictionary.json 에 카피가 있는 언어가 없습니다.');
        return;
    }

    // hreflang cross-link을 만들려면 지금 만드는 언어 하나뿐 아니라, 대상 언어
    // 전체의 seo.json(hreflang 값)이 미리 다 필요합니다.
    const localesBySlug = {};
    for (const slug of targetSlugs) {
        localesBySlug[slug] = JSON.parse(fs.readFileSync(path.join(root, 'locales', slug, 'seo.json'), 'utf8'));
    }
    // global-config.js 의 __TENTEN_STATIC_LOCALE_PATHS__ 와 동일한 모양의
    // {languageCode: urlSlug} 맵. index.html 등 다른 정적 페이지들이 이미
    // 쓰는 것과 같은 구조를 그대로 재사용합니다(새 규칙 아님).
    const localePathMap = Object.fromEntries(
        targetSlugs.map((slug) => [localesBySlug[slug].code, localesBySlug[slug].slug])
    );

    for (const slug of targetSlugs) {
        const locale = localesBySlug[slug];
        const copy = wordDictionaryCopy[slug];
        // 이 locale 방문자의 "완전 첫 방문" 기본 언어쌍 - 실제 앱의
        // resolveTentenLanguageState/resolveGlobalQuizItem 을 그대로 호출해서 얻습니다.
        const languageApi = loadTentenLanguageApi(locale.code);
        const messages = i18nMessages[locale.code];
        if (!messages) throw new Error(`i18n.js 에 ${locale.code} 메시지가 없습니다.`);

        const sectionLabels = {};
        for (const key of SECTIONS) sectionLabels[key] = messages[`section_${key}`];

        const footerNav = {
            navLabel: slug === 'ko' ? '사이트 안내' : 'Site navigation',
            backLabel: copy.headerBackLabel || 'Back to quiz',
            links: [
                { href: `/${slug}/`, label: slug === 'ko' ? '홈' : 'Home' },
                { href: `/${slug}/words/`, label: copy.footerLinkLabel },
                { href: `/${slug}/about/`, label: messages.aboutSite },
                { href: `/${slug}/guide/`, label: messages.learningGuide },
                { href: `/${slug}/contact/`, label: messages.contactSupport },
                { href: `/${slug}/privacy/`, label: messages.privacyPolicy },
                { href: `/${slug}/terms/`, label: messages.termsOfService }
            ]
        };

        const wordsDir = path.join(root, slug, 'words');
        fs.mkdirSync(wordsDir, { recursive: true });

        const hubAlternates = buildAlternateLinksHtml(siteUrl, targetSlugs, localesBySlug, (s) => `/${s}/words/`);
        const hubHtml = injectStaticLocaleBootstrap(
            buildHubPage({ locale, copy, sectionLabels, footerNav, siteUrl, alternateLinksHtml: hubAlternates }),
            locale,
            localePathMap
        );
        fs.writeFileSync(path.join(wordsDir, 'index.html'), hubHtml);

        for (const sectionKey of SECTIONS) {
            const sectionDir = path.join(wordsDir, slugify(sectionKey));
            fs.mkdirSync(sectionDir, { recursive: true });
            const pageUrl = `${siteUrl}/${slug}/words/${slugify(sectionKey)}/`;
            const sectionAlternates = buildAlternateLinksHtml(siteUrl, targetSlugs, localesBySlug, (s) => `/${s}/words/${slugify(sectionKey)}/`);
            const html = injectStaticLocaleBootstrap(buildSectionPage({
                locale,
                sectionKey,
                words: wordData[sectionKey],
                copy,
                sectionLabel: sectionLabels[sectionKey],
                brandLabel: 'TentenQuiz',
                backLabel: footerNav.backLabel,
                footerNav,
                pageUrl,
                siteUrl,
                alternateLinksHtml: sectionAlternates,
                languageApi
            }), locale, localePathMap);
            fs.writeFileSync(path.join(sectionDir, 'index.html'), html);
        }
        console.log(`[word-dictionary] ${slug}: 허브 1개 + 섹션 ${SECTIONS.length}개 생성 완료`);
    }
}

// build-multilingual-seo.js의 sitemap 생성부에서 호출합니다. 실제로 생성된
// {slug}/words/index.html 파일이 있는 언어만 대상으로 하며, hub 1개 + section
// 10개 × 대상 언어 수만큼의 <url> 항목을 돌려줍니다(언어 수 12개 기준 132개).
// legacy(x-default 전용) 페이지가 따로 없으므로 13번째 URL을 추가로 만들지 않고,
// x-default는 en 항목에 대한 hreflang 주석으로만 붙입니다.
function buildSitemapEntries() {
    const siteConfig = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'site.json'), 'utf8'));
    const wordDictionaryCopy = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'word-dictionary.json'), 'utf8'));
    const siteUrl = siteConfig.baseUrl;

    const targetSlugs = siteConfig.locales.filter((slug) => (
        wordDictionaryCopy[slug] && fs.existsSync(path.join(root, slug, 'words', 'index.html'))
    ));
    if (targetSlugs.length === 0) return [];

    const localesBySlug = {};
    for (const slug of targetSlugs) {
        localesBySlug[slug] = JSON.parse(fs.readFileSync(path.join(root, 'locales', slug, 'seo.json'), 'utf8'));
    }

    const pathSuffixes = ['/words/', ...SECTIONS.map((key) => `/words/${slugify(key)}/`)];
    const entries = [];
    for (const suffix of pathSuffixes) {
        const alternates = [
            ...targetSlugs.map((slug) => ({ hreflang: localesBySlug[slug].hreflang, url: `${siteUrl}/${slug}${suffix}` })),
            { hreflang: 'x-default', url: `${siteUrl}/en${suffix}` }
        ];
        for (const slug of targetSlugs) {
            entries.push({ url: `${siteUrl}/${slug}${suffix}`, alternates });
        }
    }
    return entries;
}

// build-multilingual-seo.js의 홈 페이지 빌드에서 호출합니다.
// data-i18n="wordDictionaryLink" 속성으로 링크를 식별합니다(href 값으로 찾지 않음).
// 이렇게 해야 루트 index.html의 href가 무엇이든(예: /en/words/ 고정값) 상관없이
// 언어별 빌드 때마다 항상 그 언어의 사전 경로로 정확히 재작성됩니다.
// 홈 소개 카드와 footer 두 곳에 같은 data-i18n 값을 쓰는 링크가 있으므로
// 반드시 g 플래그로 전부 치환해야 합니다(하나만 바꾸면 나머지가 rewriteLocalizedLinks
// 의 홈 링크 처리에 걸려 엉뚱한 href로 남습니다).
// 해당 언어의 단어 사전이 아직 생성되지 않았으면 깨진 링크를 남기지 않도록
// 링크 자체를 제거합니다.
function injectWordDictionaryLink(html, locale) {
    const hasDictionary = fs.existsSync(path.join(root, locale.slug, 'words', 'index.html'));
    const pattern = /<a\b[^>]*data-i18n=["']wordDictionaryLink["'][^>]*>[\s\S]*?<\/a>\s*/gi;
    if (!hasDictionary) return html.replace(pattern, '');
    return html.replace(pattern, (tag) => tag.replace(/href=["'][^"']*["']/, `href="/${locale.slug}/words/"`));
}

if (require.main === module) run();

module.exports = { run, SECTIONS, slugify, injectWordDictionaryLink, buildSitemapEntries };
