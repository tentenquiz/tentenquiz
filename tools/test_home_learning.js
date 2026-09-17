// 홈 소개 블록(home-learning) 회귀 테스트 - "제목 + 본문 2개 + 본문 안 인라인
// 사전 링크" 구조를 검증합니다. 번역 문장 전체를 하드코딩해서 비교하지 않고,
// locales/home-learning.json 데이터와 실제 생성된 HTML(renderHomeLearning
// 출력)이 서로 일치하는지를 기준으로 검증합니다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const copy = require('../locales/home-learning.json');
const { renderHomeLearning } = require('./build-home-learning');

// 루트 index.html은 빌드 파이프라인과 별도로 관리되어 줄바꿈 방식(CRLF)이
// 다를 수 있습니다. 렌더링과 무관하므로 비교 전에 정규화합니다.
const normalizeNewlines = value => value.replace(/\r\n/g, '\n');

for (const slug of ['', ...Object.keys(copy)]) {
    const file = `${slug ? slug + '/' : ''}index.html`;
    const html = normalizeNewlines(fs.readFileSync(path.join(root, file), 'utf8'));
    const renderSlug = slug || 'en';
    const entry = copy[renderSlug];

    // 데이터 자체: 제목 + 본문 2개, 전부 비어있지 않고, 본문2에 링크 토큰 존재.
    assert.equal(entry.length, 3, `home-learning.json entry must have title + 2 body paragraphs: ${renderSlug}`);
    entry.forEach((value, index) => {
        assert.ok(typeof value === 'string' && value.trim().length > 0, `field ${index} must not be empty: ${renderSlug}`);
    });
    assert.match(entry[2], /\{wordDictionaryLink\}/, `body2 must contain the {wordDictionaryLink} token: ${renderSlug}`);

    // HTML은 항상 renderHomeLearning(slug) 의 실제 출력과 정확히 일치해야 합니다
    // (기대 문자열을 따로 하드코딩하지 않음 - 데이터/생성 결과 일치 여부만 봅니다).
    assert.equal(html.split('<!-- home-learning:start -->').length, 2, `home-learning block must appear once: ${file}`);
    assert.ok(html.includes(renderHomeLearning(renderSlug)), `home-learning block must match renderHomeLearning output: ${file}`);

    const block = /<!-- home-learning:start -->[\s\S]*?<!-- home-learning:end -->/.exec(html)[0];
    assert.equal((block.match(/<h2\b/g) || []).length, 1, `exactly one title: ${file}`);
    assert.equal((block.match(/<p\b/g) || []).length, 2, `exactly two body paragraphs: ${file}`);

    // 예전 8단어 샘플 카드도, 큰 CTA 버튼도 더 이상 없어야 합니다.
    assert.ok(!block.includes('home-learning-samples'), `old sample list must be gone: ${file}`);
    assert.ok(!block.includes('data-word-section'), `old sample word markup must be gone: ${file}`);
    assert.ok(!block.includes('word-dict-cta'), `big CTA button markup must be gone from home-learning: ${file}`);

    // 본문 안에 preference 재작성 대상 속성(data-i18n)을 가진 인라인 링크가
    // 있어야 하고, 그 href가 이 locale의 사전 허브를 정확히 가리켜야 합니다.
    const linkPattern = /<a class="home-learning-link" href="(\/[a-z-]+\/words\/)" data-i18n="wordDictionaryLink">[^<]+<\/a>/;
    const linkMatch = linkPattern.exec(block);
    assert.ok(linkMatch, `inline dictionary link must exist inside the body text: ${file}`);
    assert.equal(linkMatch[1], `/${renderSlug}/words/`, `dictionary link must point to this locale's hub: ${file}`);

    console.log(`PASS structure / data-matched render / inline link: ${file}`);
}

const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8');
    fs.createReadStream(file).pipe(res);
});

(async () => {
    let chromium;
    try {
        ({ chromium } = require('playwright'));
    } catch (error) {
        console.log('SKIP: playwright not installed in this environment - source-level checks above already passed.');
        server.close();
        return;
    }

    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launch({ headless: true, executablePath: [chromium.executablePath(), 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync) });
        const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
        await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
        const page = await context.newPage();
        const base = `http://127.0.0.1:${server.address().port}`;

        for (const slug of ['ko', 'en', 'ja', 'zh-tw', 'ar']) {
            await page.goto(`${base}/${slug}/`, { waitUntil: 'load' });
            await page.waitForFunction(() => typeof activeQuizData !== 'undefined' && activeQuizData.length === 2500);
            for (const width of [375, 1280]) {
                await page.setViewportSize({ width, height: 800 });
                const state = await page.locator('.home-learning').evaluate(el => {
                    const box = el.getBoundingClientRect();
                    const link = el.querySelector('.home-learning-link');
                    return {
                        visible: el.checkVisibility(),
                        left: box.left,
                        right: box.right,
                        overflow: document.documentElement.scrollWidth > innerWidth,
                        clipped: [...el.querySelectorAll('h2,p')].some(n => n.scrollWidth > n.clientWidth + 1),
                        direction: getComputedStyle(el).direction,
                        bigButtonCount: el.querySelectorAll('.word-dict-cta').length,
                        paragraphCount: el.querySelectorAll('p').length,
                        linkHref: link ? link.getAttribute('href') : null,
                        linkDisplay: link ? getComputedStyle(link).display : null,
                        linkBackground: link ? getComputedStyle(link).backgroundColor : null
                    };
                });
                assert.ok(state.visible && !state.overflow && !state.clipped && state.left >= 0 && state.right <= width, JSON.stringify({ slug, width, state }));
                assert.equal(state.direction, slug === 'ar' ? 'rtl' : 'ltr');
                assert.equal(state.paragraphCount, 2, 'exactly two body paragraphs rendered');
                assert.equal(state.bigButtonCount, 0, 'no big CTA button inside home-learning');
                assert.match(state.linkHref || '', new RegExp(`^/${slug}/words/`), 'dictionary link keeps its base path');
                assert.equal(state.linkDisplay, 'inline', 'dictionary link must stay an inline text link, not a block-level button');
                assert.equal(state.linkBackground, 'rgba(0, 0, 0, 0)', 'dictionary link must have no background color');
                console.log(`PASS ${width}px / visible / no overflow-clipping / inline (not button) dictionary link: ${slug}`);
            }
        }
        await context.close();
    } finally {
        if (browser) await browser.close();
        await new Promise(r => server.close(r));
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
