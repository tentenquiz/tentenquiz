const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg'
};

const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relativePath = pathname === '/'
        ? 'index.html'
        : pathname.endsWith('/')
            ? `${pathname.replace(/^\/+/, '')}index.html`
            : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(root, relativePath);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        response.writeHead(404);
        response.end('Not found');
        return;
    }
    response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(response);
});

function findBrowserExecutable() {
    return [
        chromium.executablePath(),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ].find((candidate) => candidate && fs.existsSync(candidate));
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        const executablePath = findBrowserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available');
        browser = await chromium.launch({ headless: true, executablePath });
        const context = await browser.newContext({ viewport: { width: 430, height: 920 } });
        await context.addInitScript(() => {
            localStorage.setItem('tenten.interfaceLanguage', 'ru');
            localStorage.setItem('tenten.learningLanguage', 'ja');
            window.__tentenRecordedAudio = [];
            HTMLMediaElement.prototype.play = function playForTest() {
                window.__tentenRecordedAudio.push(String(this.src || ''));
                return Promise.resolve();
            };
            HTMLMediaElement.prototype.pause = () => {};
        });
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));

        await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.getElementById('interface-language-select')?.options.length === 12);
        await page.selectOption('#interface-language-select', 'vi');
        await page.waitForURL((url) => url.pathname === '/vi/' && !url.searchParams.has('native'));
        assert(await page.locator('html').getAttribute('lang') === 'vi', 'The x-default home did not switch to the Vietnamese directory URL');

        await page.goto(`${origin}/en/`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof activeQuizData !== 'undefined' && activeQuizData.length === 2500);
        assert(await page.locator('html').getAttribute('lang') === 'en', '/en/ did not keep English as its interface language');
        assert(await page.locator('#interface-language-select').inputValue() === 'en', 'Saved browser language overrode the static English route');
        assert((await page.title()).startsWith('TentenQuiz | 10-question'), '/en/ title is not English');

        await page.goto(`${origin}/ko/?learn=en`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof activeQuizData !== 'undefined' && activeQuizData.length === 2500);
        await page.evaluate(() => {
            window.__tentenRecordedAudio = [];
            const question = activeQuizData.find((item) => String(item.audioFile || '').includes('audio/en/'));
            if (!question) throw new Error('An English question with bundled audio is required');
            playPronunciationAudio(question.prompt || question.word || question.question, question);
        });
        await page.waitForFunction(() => window.__tentenRecordedAudio.length > 0);
        const englishAudioPath = await page.evaluate(() => new URL(window.__tentenRecordedAudio[0]).pathname);
        assert(englishAudioPath.startsWith('/audio/en/'), `Localized route resolved English audio incorrectly: ${englishAudioPath}`);
        const englishAudioResponse = await page.evaluate(async () => {
            const response = await fetch(window.__tentenRecordedAudio[0]);
            return { ok: response.ok, status: response.status };
        });
        assert(englishAudioResponse.ok, `English audio file request failed with HTTP ${englishAudioResponse.status}`);

        await page.selectOption('#interface-language-select', 'ja');
        await page.waitForURL((url) => url.pathname === '/ja/' && !url.searchParams.has('native'));
        await page.waitForFunction(() => document.getElementById('interface-language-select')?.value === 'ja');
        assert(await page.locator('html').getAttribute('lang') === 'ja', 'Main language switch did not navigate to the Japanese route');

        await page.goto(`${origin}/vi/about/`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#content-language-select');
        assert(await page.locator('html').getAttribute('lang') === 'vi', '/vi/about/ did not keep Vietnamese');
        assert((await page.locator('h1').innerText()).includes('Giới thiệu'), '/vi/about/ did not render Vietnamese content');
        assert(await page.locator('link[rel="canonical"]').getAttribute('href') === 'https://tentenquiz.com/vi/about/', 'Vietnamese canonical changed at runtime');

        await page.selectOption('#content-language-select', 'ja');
        await page.waitForURL((url) => url.pathname === '/ja/about/');
        await page.waitForSelector('#content-language-select');
        assert(await page.locator('html').getAttribute('lang') === 'ja', 'Content language switch did not navigate to the Japanese route');
        assert((await page.locator('h1').innerText()).includes('について'), '/ja/about/ did not render Japanese content');

        await page.goto(`${origin}/ar/`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.getElementById('interface-language-select')?.value === 'ar');
        assert(await page.locator('html').getAttribute('dir') === 'rtl', '/ar/ did not enable RTL');
        assert(pageErrors.length === 0, `Localized pages raised browser errors: ${pageErrors.join(' | ')}`);

        console.log('OK: localized home routes override stale browser language and load the full quiz data');
        console.log('OK: localized routes resolve bundled learning audio from the site root');
        console.log('OK: main and content language selectors navigate between clean locale directory URLs');
        console.log('OK: translated support pages keep their canonical URL at runtime');
        console.log('OK: Arabic static pages use RTL and localized routes produce no browser errors');
        await context.close();
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
