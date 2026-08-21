const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const projectRoot = path.resolve(__dirname, '..');
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg'
};

const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(projectRoot, relativePath);
    if (!filePath.startsWith(projectRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        response.writeHead(404);
        response.end('Not found');
        return;
    }
    response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(response);
});

function findBrowserExecutable() {
    const candidates = [
        chromium.executablePath(),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function overlaps(first, second) {
    return first.x < second.x + second.width
        && first.x + first.width > second.x
        && first.y < second.y + second.height
        && first.y + first.height > second.y;
}

async function dispatchInstallPrompt(page, outcome = 'accepted') {
    await page.evaluate((selectedOutcome) => {
        const event = new Event('beforeinstallprompt', { cancelable: true });
        event.prompt = async () => {
            window.__tentenInstallPromptCalled = true;
            return { outcome: selectedOutcome };
        };
        event.userChoice = Promise.resolve({ outcome: selectedOutcome });
        window.dispatchEvent(event);
    }, outcome);
}

async function assertTopLeftWithoutTitleOverlap(page, selector, label) {
    const installButton = page.locator(selector);
    if (!(await installButton.isVisible())) {
        throw new Error(`${label}: install button must be visible before installation`);
    }
    const button = await installButton.boundingBox();
    const card = await page.locator('#section-select-screen').boundingBox();
    const title = await page.locator('#section-select-screen .start-title').boundingBox();
    if (!button || !card || !title) throw new Error(`${label}: required layout boxes are missing`);
    const relativeLeft = button.x - card.x;
    const relativeTop = button.y - card.y;
    if (relativeLeft > 14 || relativeTop > 14 || relativeLeft < 0 || relativeTop < 0) {
        throw new Error(`${label}: install button is not anchored to the card’s top-left corner`);
    }
    if (button.height > 30 || overlaps(button, title)) {
        throw new Error(`${label}: install button is too large or overlaps the animated title`);
    }
}

(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const origin = `http://127.0.0.1:${port}`;
    let browser;
    try {
        const executablePath = findBrowserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available for the PWA browser test');
        browser = await chromium.launch({ headless: true, executablePath });

        const desktop = await browser.newContext({ viewport: { width: 430, height: 920 }, deviceScaleFactor: 1.5 });
        const desktopPage = await desktop.newPage();
        await desktopPage.goto(`${origin}/?native=ko&learn=vi`, { waitUntil: 'domcontentloaded' });
        await desktopPage.waitForSelector('.stage-select-btn');
        await desktopPage.waitForFunction(async () => Boolean(await navigator.serviceWorker.getRegistration()));
        await dispatchInstallPrompt(desktopPage);
        await desktopPage.waitForSelector('#pwa-install-stage-btn:not([hidden])');
        if ((await desktopPage.locator('#pwa-install-stage-btn .pwa-install-label').textContent()).trim() !== '설치') {
            throw new Error('desktop install button must use the short localized label');
        }
        await assertTopLeftWithoutTitleOverlap(desktopPage, '#pwa-install-stage-btn', 'stage screen');
        if (process.env.TENTEN_PWA_MAIN_CAPTURE) {
            await desktopPage.locator('#section-select-screen').screenshot({ path: process.env.TENTEN_PWA_MAIN_CAPTURE });
        }

        await desktopPage.click('.stage-select-btn');
        await desktopPage.waitForFunction(() => document.getElementById('selected-section-banner').style.display === 'block');
        await desktopPage.evaluate(() => window.scrollTo(0, 0));
        if (!(await desktopPage.locator('#pwa-install-stage-btn').isHidden())) {
            throw new Error('stage install button must hide on the section screen');
        }
        await assertTopLeftWithoutTitleOverlap(desktopPage, '#pwa-install-section-btn', 'section screen');
        if (process.env.TENTEN_PWA_SECTION_CAPTURE) {
            await desktopPage.locator('#section-select-screen').screenshot({ path: process.env.TENTEN_PWA_SECTION_CAPTURE });
        }
        await desktopPage.click('#pwa-install-section-btn');
        await desktopPage.waitForSelector('#pwa-desktop-install-dialog[open]');
        const desktopGuide = (await desktopPage.locator('#pwa-desktop-install-dialog p').textContent()).trim();
        if (desktopGuide !== '설치창에서 ‘바탕화면 바로가기 만들기’를 체크해 주세요.') {
            throw new Error(`desktop shortcut guidance is incorrect: ${desktopGuide}`);
        }
        if (await desktopPage.evaluate(() => window.__tentenInstallPromptCalled === true)) {
            throw new Error('the browser install prompt must wait until the learner confirms the desktop shortcut guidance');
        }
        await desktopPage.click('#pwa-desktop-install-continue-btn');
        await desktopPage.waitForFunction(() => window.__tentenInstallPromptCalled === true);
        if (!(await desktopPage.locator('#pwa-install-section-btn').isHidden())) {
            throw new Error('accepted desktop installation must hide the install button');
        }
        await desktop.close();

        const ios = await browser.newContext({
            viewport: { width: 390, height: 844 },
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'
        });
        const iosPage = await ios.newPage();
        await iosPage.goto(`${origin}/?native=ko&learn=vi`, { waitUntil: 'domcontentloaded' });
        await iosPage.waitForSelector('#pwa-install-stage-btn:not([hidden])');
        if ((await iosPage.locator('#pwa-install-stage-btn .pwa-install-label').textContent()).trim() !== '아이콘') {
            throw new Error('iOS install button must use the short icon label');
        }
        await iosPage.click('#pwa-install-stage-btn');
        await iosPage.waitForSelector('#pwa-install-help-dialog[open]');
        await iosPage.click('#pwa-install-complete-btn');
        if (!(await iosPage.locator('#pwa-install-stage-btn').isHidden())) {
            throw new Error('confirming the iOS icon must hide the install button');
        }
        await iosPage.reload({ waitUntil: 'domcontentloaded' });
        if (!(await iosPage.locator('#pwa-install-stage-btn').isHidden())) {
            throw new Error('the iOS install button must remain hidden after confirmation');
        }
        await ios.close();

        const installed = await browser.newContext({
            viewport: { width: 390, height: 844 },
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'
        });
        await installed.addInitScript(() => {
            Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
        });
        const installedPage = await installed.newPage();
        await installedPage.goto(`${origin}/?native=ko&learn=vi`, { waitUntil: 'domcontentloaded' });
        if (!(await installedPage.locator('#pwa-install-stage-btn').isHidden()) || !(await installedPage.locator('#pwa-install-section-btn').isHidden())) {
            throw new Error('installed standalone learners must never see the install button');
        }
        await installed.close();

        console.log('OK: install button stays small at the card top-left on stage and section screens');
        console.log('OK: desktop learners see the shortcut checkbox reminder before the browser install prompt');
        console.log('OK: accepted desktop installations hide the install button');
        console.log('OK: iOS shows localized Home Screen instructions and remembers confirmation');
        console.log('OK: standalone installed learners never see the install button');
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
