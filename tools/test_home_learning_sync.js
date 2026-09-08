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
        const codeFor = slug => ({ 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW' }[slug] || slug);
        const check = async slug => {
            await page.waitForFunction(() => document.querySelector('.home-learning').dataset.languagePair === window.tentenGlobal.interfaceLanguage + '/' + window.tentenGlobal.learningLanguage);
            const target = await page.evaluate(() => window.tentenGlobal.learningLanguage.toLowerCase().replace('-', '_'));
            const native = slug.replace('-', '_');
            assert.equal(await page.locator('#home-learning-title').textContent(), copy[slug][0]);
            const cards = await page.locator('.home-learning li').evaluateAll(items => items.map(item => ({ id:item.dataset.wordId, section:item.dataset.wordSection, words:[...item.querySelectorAll('bdi')].map(n=>n.textContent), reading:item.querySelector('.home-learning-reading')?.textContent || '', note:item.lastElementChild.textContent })));
            assert.equal(cards.length,8);
            for (const card of cards) {
                const word = JSON.parse(fs.readFileSync(path.join(root,'data',card.section+'.json'),'utf8')).find(w=>w.id===card.id);
                assert.deepEqual(card.words,[word['word_'+target],word['word_'+native]]);
                assert.ok(card.words.every(w=>typeof w==='string' && w.trim() && !/undefined|null/.test(w)));
                const reading=word['reading_'+target];
                assert.equal(card.reading,reading && reading!==word['word_'+target]?reading:'');
                assert.equal(card.note,word['note_'+native]);
            }
            assert.equal(await page.locator('.home-learning > p').nth(3).textContent(),copy[slug][10]);
        };
        await page.goto(base + '/');
        await page.waitForFunction(() => typeof activeQuizData !== 'undefined' && activeQuizData.length === 2500);
        const initial = await page.evaluate(() => window.tentenGlobal.interfaceLanguage.toLowerCase());
        await check(initial);
        console.log('PASS root startup follows current UI language');
        let combinations=0;
        for (const slug of Object.keys(copy)) {
            for (const learning of Object.keys(copy)) {
                if (slug===learning) continue;
                await page.evaluate(([native,target])=>{window.tentenGlobal.interfaceLanguage=native;window.tentenGlobal.learningLanguage=target;window.applyTentenI18n();},[codeFor(slug),codeFor(learning)]);
                await check(slug);
                await checkCards();
                combinations++;
            }
        }
        assert.equal(combinations,132);
        console.log('PASS 132 valid language pairs / exact words, readings, notes / all five widths');
        // Exercise the real UI control as well as the in-place i18n hook.
        for (const slug of Object.keys(copy)) {
            const code = { 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW' }[slug] || slug;
            await page.selectOption('#interface-language-select', code);
            await page.waitForLoadState('load');
            await check(slug);
            console.log(`PASS user language selector: ${slug}`);
        }
        for (const [native,target] of [['ko','ja'],['ko','en'],['en','ja'],['ja','ko']]) {
            await page.selectOption('#interface-language-select',native);
            await page.waitForLoadState('load');
            await page.selectOption('#learning-language-select',target);
            await page.waitForLoadState('load');
            await check(native);
            await page.reload();
            await check(native);
        }
        console.log('PASS real dropdown pair transitions and reload persistence');
        await page.route('**/locales/home-learning.json',async route=>{await new Promise(r=>setTimeout(r,400));await route.continue();});
        await page.goto(base+'/?native=ko&learn=ja',{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>typeof window.applyTentenI18n==='function');
        await page.evaluate(()=>{for(const [native,target] of [['en','ja'],['ja','ko'],['ko','en']]){window.tentenGlobal.interfaceLanguage=native;window.tentenGlobal.learningLanguage=target;window.applyTentenI18n();}});
        await check('ko');
        await page.waitForTimeout(500);
        await check('ko');
        assert.equal(await page.locator('.home-learning').getAttribute('data-language-pair'),'ko/en');
        console.log('PASS delayed fetch / rapid pair changes retain latest pair');
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
