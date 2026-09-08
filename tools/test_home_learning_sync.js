const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { renderHomeLearning } = require('./build-home-learning');
const copy = require('../locales/home-learning.json');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) && file !== root) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8');
    fs.createReadStream(file).pipe(res);
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
        await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
        const page = await context.newPage();
        const base = `http://127.0.0.1:${server.address().port}`;
        const checkCards = async () => {
            for (const width of [320, 360, 390, 430, 1024]) {
                await page.setViewportSize({ width, height: 800 });
                const state = await page.locator('.home-learning').evaluate(el => {
                    const list = el.querySelector('ul');
                    const cards = [...list.children];
                    const styles = cards.map(card => {
                        const s = getComputedStyle(card);
                        return [s.backgroundColor, s.borderTopWidth, s.borderRadius, s.listStyleType, s.display, s.textAlign];
                    });
                    return { columns: getComputedStyle(list).gridTemplateColumns.split(' ').length,
                        grid: getComputedStyle(list).display, styles, count: cards.length,
                        overflow: document.documentElement.scrollWidth > innerWidth,
                        clipped: [...el.querySelectorAll('li,p,h2,h3')].some(n => n.scrollWidth > n.clientWidth + 1),
                        direction: getComputedStyle(el).direction, lang: el.lang };
                });
                assert.equal(state.columns, width <= 430 ? 1 : 2);
                assert.equal(state.grid, 'grid');
                assert.equal(state.count, 8);
                assert.ok(!state.overflow && !state.clipped);
                assert.equal(state.direction, state.lang === 'ar' ? 'rtl' : 'ltr');
                for (const style of state.styles) {
                    assert.deepEqual(style, state.styles[0]);
                    assert.equal(style[0], 'rgb(251, 244, 232)');
                    assert.equal(style[1], '1px');
                    assert.equal(style[3], 'none');
                    assert.equal(style[4], 'block');
                    assert.equal(style[5], 'start');
                }
            }
            await page.setViewportSize({ width: 320, height: 800 });
        };
        const check = async slug => {
            await page.waitForFunction(title => document.querySelector('#home-learning-title').textContent === title, copy[slug][0]);
            const actual = await page.locator('.home-learning').evaluate(el => ({ html: el.outerHTML, width: document.documentElement.scrollWidth, visible: el.checkVisibility(), clipped: [...el.querySelectorAll('p,li,h2,h3')].some(n => n.scrollWidth > n.clientWidth + 1) }));
            const expected = await page.evaluate(html => {
                const template = document.createElement('template');
                template.innerHTML = html;
                return template.content.querySelector('section').outerHTML;
            }, renderHomeLearning(slug));
            assert.equal(actual.html, expected, `${slug}: runtime equals static renderer including all eight data samples`);
            assert.ok(actual.width <= 320 && actual.visible && !actual.clipped, JSON.stringify(actual));
        };
        await page.goto(base + '/');
        await page.waitForFunction(() => typeof activeQuizData !== 'undefined' && activeQuizData.length === 2500);
        const initial = await page.evaluate(() => window.tentenGlobal.interfaceLanguage.toLowerCase());
        await check(initial);
        console.log('PASS root startup follows current UI language');
        for (const slug of Object.keys(copy)) {
            const code = { 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW' }[slug] || slug;
            await page.evaluate(code => { window.tentenGlobal.interfaceLanguage = code; window.applyTentenI18n(); }, code);
            await check(slug);
            await checkCards();
            console.log(`PASS immediate i18n update / exact data / 320px / direction: ${slug}`);
        }
        // Exercise the real UI control as well as the in-place i18n hook.
        for (const slug of Object.keys(copy)) {
            const code = { 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW' }[slug] || slug;
            await page.selectOption('#interface-language-select', code);
            await page.waitForLoadState('load');
            await check(slug);
            console.log(`PASS user language selector: ${slug}`);
        }
        await context.close();
        const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
        const staticPage = await noJS.newPage();
        await noJS.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
        for (const slug of ['', ...Object.keys(copy)]) {
            await staticPage.goto(base + '/' + (slug ? slug + '/' : ''));
            assert.equal(await staticPage.locator('#home-learning-title').textContent(), copy[slug || 'en'][0]);
            for (const width of [320, 360, 390, 430, 1024]) {
                await staticPage.setViewportSize({ width, height: 800 });
                const state = await staticPage.locator('.home-learning-samples').evaluate(el => ({
                    columns: getComputedStyle(el).gridTemplateColumns.split(' ').length,
                    cards: [...el.children].filter(n => getComputedStyle(n).backgroundColor === 'rgb(251, 244, 232)' && getComputedStyle(n).listStyleType === 'none').length,
                    overflow: document.documentElement.scrollWidth > innerWidth
                }));
                assert.equal(state.columns, width <= 430 ? 1 : 2);
                assert.equal(state.cards, 8);
                assert.ok(!state.overflow);
            }
            console.log(`PASS no-JS static cards at all five widths: ${slug || 'root'}`);
        }
        await noJS.close();
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
