const fs = require('fs');
const http = require('http');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const localeSlugs = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'site.json'), 'utf8')).locales;
const sandbox = { window: {}, console };
sandbox.globalThis = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), sandbox, { filename: 'i18n.js' });
const messages = sandbox.window.TENTEN_I18N_MESSAGES;

const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json; charset=utf-8'
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

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function browserExecutable() {
    return [
        chromium.executablePath(),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ].find((candidate) => candidate && fs.existsSync(candidate));
}

(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        const executablePath = browserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available');
        browser = await chromium.launch({ headless: true, executablePath });
        const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'share', {
                configurable: true,
                value: async (payload) => { window.__sharePayload = payload; }
            });
        });

        const page = await context.newPage();
        for (const slug of localeSlugs) {
            await page.goto(`${origin}/${slug}/`, { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => typeof window.tentenT === 'function' && typeof shareToKakao === 'function');
            const state = await page.evaluate(() => {
                const button = document.getElementById('share-result-btn');
                const card = document.getElementById('result-card');
                card.style.display = 'block';
                const bounds = button.getBoundingClientRect();
                return {
                    buttonText: button.textContent.trim(),
                    buttonHeight: bounds.height,
                    buttonLeft: bounds.left,
                    buttonRight: bounds.right,
                    viewportWidth: window.innerWidth,
                    image: document.querySelector('meta[property="og:image"]')?.content || ''
                };
            });
            const code = await page.evaluate(() => window.__TENTEN_STATIC_INTERFACE_LANGUAGE__);
            assert(state.buttonText === messages[code].shareResult, `Wrong share label for ${slug}`);
            assert(state.buttonHeight >= 54, `Share button is too short for ${slug}`);
            assert(state.buttonLeft >= 0 && state.buttonRight <= state.viewportWidth, `Share button overflows at 360px for ${slug}`);
            assert(state.image === `https://tentenquiz.com/assets/social/og-image-${slug}.png`, `Wrong card image for ${slug}`);
        }

        await page.goto(`${origin}/ko/`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof shareToKakao === 'function');
        const payload = await page.evaluate(async () => {
            score = 7;
            finalTotalTimeText = '12.34';
            window.__sharePayload = null;
            await shareToKakao();
            return window.__sharePayload;
        });
        assert(payload.title.startsWith('텐텐퀴즈 · '), 'Korean share title is missing');
        assert(payload.text.includes('10문제를 12.34초에 풀고 7개를 맞혔어요!'), 'Korean result values are missing');
        assert(payload.text.includes('\n짧고 재미있게'), 'Korean warm recommendation is missing');
        assert(payload.url === `${origin}/ko/`, 'The current localized URL is not shared');

        console.log('OK: all 12 localized share buttons fit a 360px viewport');
        console.log('OK: all 12 localized pages reference their matching social card');
        console.log('OK: the Korean native share payload contains the score, warm invitation, and localized URL');
        await context.close();
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
