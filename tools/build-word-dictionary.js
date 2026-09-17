// 단어 사전(글로서리) 정적 페이지 생성기.
// data/*.json 의 단어 데이터를 언어별/섹션별 정적 HTML로 펼쳐 애드센스·검색엔진
// 크롤러가 실제 텍스트 콘텐츠를 볼 수 있게 합니다. locales/word-dictionary.json 에
// 카피가 있는 언어만 생성합니다 (지금은 ko 파일럿).
//
// 실행: node tools/build-word-dictionary.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

function buildWordCard(word, target, native) {
    const headword = word[`word_${target}`];
    const gloss = word[`word_${native}`];
    const reading = word[`reading_${target}`];
    const note = word[`note_${native}`];
    if (!headword || !gloss || !note) throw new Error(`Missing fields for ${word.id} (${target}/${native})`);
    const readingHtml = reading && reading !== headword
        ? `<p class="stage-preview-reading" lang="${target}">${escape(reading)}</p>`
        : '';
    return `<div class="stage-preview-card"><p class="stage-preview-word" lang="${target}">${escape(headword)}<span class="stage-preview-arrow">—</span>${escape(gloss)}</p>${readingHtml}<p class="stage-preview-note">${escape(note)}</p></div>`;
}

function buildStageBlock(stage, words, target, native, stageLabel) {
    const cards = words.filter((w) => w.stage === stage).map((w) => buildWordCard(w, target, native)).join('\n');
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

function buildSectionPage({ locale, sectionKey, words, copy, sectionLabel, brandLabel, backLabel, footerNav, pageUrl, siteUrl, alternateLinksHtml }) {
    const target = locale.slug === 'en' ? 'ja' : 'en';
    const native = locale.slug.replace(/-/g, '_');
    const title = `${sectionLabel} ${copy.titleSuffix} | TentenQuiz`;
    const sectionIntro = copy.sections[sectionKey] || '';
    const description = `${sectionLabel}: ${sectionIntro}`.slice(0, 160);
    const stageBlocks = Array.from({ length: 10 }, (_, i) => i + 1)
        .map((stage) => buildStageBlock(stage, words, target, native, copy.stageLabel))
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
</head>
<body>
    <div class="quiz-container word-dict-container">
        <a class="word-dict-brand" href="${quizHref}" aria-label="${escape(brandLabel)}">🙌 TentenQuiz</a>
        <article class="card word-dict-card" aria-labelledby="word-dict-title">
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

    for (const slug of targetSlugs) {
        const locale = localesBySlug[slug];
        const copy = wordDictionaryCopy[slug];
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
        fs.writeFileSync(
            path.join(wordsDir, 'index.html'),
            buildHubPage({ locale, copy, sectionLabels, footerNav, siteUrl, alternateLinksHtml: hubAlternates })
        );

        for (const sectionKey of SECTIONS) {
            const sectionDir = path.join(wordsDir, slugify(sectionKey));
            fs.mkdirSync(sectionDir, { recursive: true });
            const pageUrl = `${siteUrl}/${slug}/words/${slugify(sectionKey)}/`;
            const sectionAlternates = buildAlternateLinksHtml(siteUrl, targetSlugs, localesBySlug, (s) => `/${s}/words/${slugify(sectionKey)}/`);
            const html = buildSectionPage({
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
                alternateLinksHtml: sectionAlternates
            });
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
// 해당 언어의 단어 사전이 아직 생성되지 않았으면 깨진 링크를 남기지 않도록
// 링크 자체를 제거합니다.
function injectWordDictionaryLink(html, locale) {
    const hasDictionary = fs.existsSync(path.join(root, locale.slug, 'words', 'index.html'));
    const pattern = /<a\b[^>]*data-i18n=["']wordDictionaryLink["'][^>]*>[\s\S]*?<\/a>\s*/i;
    if (!hasDictionary) return html.replace(pattern, '');
    return html.replace(pattern, (tag) => tag.replace(/href=["'][^"']*["']/, `href="/${locale.slug}/words/"`));
}

if (require.main === module) run();

module.exports = { run, SECTIONS, slugify, injectWordDictionaryLink, buildSitemapEntries };
