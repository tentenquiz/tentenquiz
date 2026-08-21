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

async function panelHeight(page, selector) {
    return page.locator(selector).evaluate((panel) => panel.getBoundingClientRect().height);
}

(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    let browser;
    try {
        const executablePath = findBrowserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available for the accordion browser test');
        browser = await chromium.launch({ headless: true, executablePath });
        const page = await browser.newPage({ viewport: { width: 430, height: 920 } });
        await page.goto(`http://127.0.0.1:${port}/?native=ko&learn=vi`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#wordbook-guide-toggle');

        const toggles = page.locator('.info-accordion .acc-toggle');
        if (await toggles.count() !== 3) throw new Error('exactly three guidance accordions must be present');
        if (await panelHeight(page, '#stage-why-panel') !== 0) throw new Error('accordion panels must start collapsed');

        await page.click('#stage-why-toggle');
        await page.waitForTimeout(380);
        if (await page.getAttribute('#stage-why-toggle', 'aria-expanded') !== 'true') throw new Error('first accordion did not report its open state');
        if (await page.getAttribute('#stage-why-panel', 'aria-hidden') !== 'false') throw new Error('open panel remains hidden from assistive technology');
        if (await panelHeight(page, '#stage-why-panel') < 80) throw new Error('first accordion content did not expand visibly');
        const firstBody = (await page.locator('#stage-why-panel').innerText()).trim();
        if (!firstBody.includes('2,500개의 생활 어휘') || !firstBody.includes('10개의 생활 주제')) {
            throw new Error('approved Korean stage guidance is missing');
        }

        await page.locator('#stage-why-panel').evaluate((panel) => {
            panel.style.fontSize = '30px';
        });
        await page.waitForTimeout(120);
        const enlargedPanel = await page.locator('#stage-why-panel').evaluate((panel) => ({
            clientHeight: panel.clientHeight,
            scrollHeight: panel.scrollHeight
        }));
        if (enlargedPanel.clientHeight + 1 < enlargedPanel.scrollHeight) {
            throw new Error('accordion clips content after text enlargement or translation reflow');
        }
        await page.locator('#stage-why-panel').evaluate((panel) => {
            panel.style.fontSize = '';
        });

        await page.click('#ten-seconds-toggle');
        await page.waitForTimeout(380);
        if (await panelHeight(page, '#stage-why-panel') !== 0 || await panelHeight(page, '#ten-seconds-panel') < 80) {
            throw new Error('opening a new accordion must close the previous one and reveal the selected content');
        }
        const arrowTransform = await page.locator('#ten-seconds-toggle .acc-arrow').evaluate((arrow) => getComputedStyle(arrow).transform);
        if (arrowTransform === 'none') throw new Error('open accordion arrow did not rotate');

        await page.click('#wordbook-guide-toggle');
        await page.waitForTimeout(380);
        const thirdTitle = (await page.locator('#wordbook-guide-toggle').innerText()).trim();
        const thirdBody = (await page.locator('#wordbook-guide-panel').innerText()).trim();
        if (!thirdTitle.includes('내 단어장은 어떻게 활용하나요?') || thirdTitle.includes('어휘 선정 기준')) {
            throw new Error('third accordion title was not replaced with the wordbook guide');
        }
        if (!thirdBody.includes('나의 언어') || !thirdBody.includes('음성으로 한 번')) {
            throw new Error('wordbook answer and voice guidance is incomplete');
        }

        await page.click('#wordbook-guide-toggle');
        await page.waitForTimeout(380);
        const boxes = await page.locator('.info-accordion').evaluateAll((sections) => sections.map((section) => section.getBoundingClientRect().toJSON()));
        for (let index = 1; index < boxes.length; index += 1) {
            const gap = boxes[index].top - boxes[index - 1].bottom;
            if (gap > 14) throw new Error(`accordion vertical gap is too large: ${gap}px`);
        }

        await page.evaluate(() => {
            score = TOTAL_QUESTIONS;
            document.getElementById('result-card').style.display = 'block';
            showPerfectScoreCelebration(TOTAL_QUESTIONS);
        });
        const globalCelebrationCanvas = page.locator('body > canvas').first();
        await globalCelebrationCanvas.waitFor({ state: 'attached' });
        if (await globalCelebrationCanvas.evaluate((canvas) => getComputedStyle(canvas).pointerEvents) !== 'none') {
            throw new Error('full-screen perfect-score confetti can intercept pointer input');
        }
        await page.click('#stage-why-toggle');
        await page.waitForTimeout(380);
        if (await page.getAttribute('#stage-why-toggle', 'aria-expanded') !== 'true') {
            throw new Error('full-screen perfect-score confetti blocked accordion clicks');
        }
        await page.evaluate(() => resetPerfectScoreCelebration());

        if (process.env.TENTEN_ACCORDION_CAPTURE) {
            await page.click('#wordbook-guide-toggle');
            await page.waitForTimeout(380);
            await page.screenshot({ path: process.env.TENTEN_ACCORDION_CAPTURE, fullPage: true });
        }

        console.log('OK: all three accordions open smoothly and only one stays open');
        console.log('OK: translated text reflow, enlarged text, arrows, accessibility states, and compact spacing are correct');
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
