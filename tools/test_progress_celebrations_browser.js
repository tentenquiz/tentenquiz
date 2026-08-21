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

async function assertCanvasHasParticles(page, selector, label) {
    await page.waitForTimeout(600);
    const canvasState = await page.locator(selector).evaluate((canvas) => {
        const context = canvas.getContext('2d');
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let paintedPixels = 0;
        for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] > 0) paintedPixels += 1;
        }
        return { width: canvas.width, height: canvas.height, paintedPixels };
    });
    if (canvasState.width === 0 || canvasState.height === 0 || canvasState.paintedPixels === 0) {
        throw new Error(`${label}: the bundled canvas did not draw visible confetti particles`);
    }
}

(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    let browser;
    try {
        const executablePath = findBrowserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available for the progress celebration test');
        browser = await chromium.launch({ headless: true, executablePath });
        const page = await browser.newPage({ viewport: { width: 430, height: 920 } });
        await page.goto(`http://127.0.0.1:${port}/?native=ko&learn=en`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.stage-select-btn');

        const confettiSource = await page.locator('script[src*="canvas-confetti"]').getAttribute('src');
        if (!confettiSource || !confettiSource.startsWith('vendor/canvas-confetti/')) {
            throw new Error(`confetti must load from the bundled vendor directory: ${confettiSource}`);
        }

        const stageFixture = await page.evaluate(async () => {
            const stage = 1;
            const sections = getAvailableSectionsByStage(stage);
            const questions = sections.flatMap((section) => getUniqueSectionQuestions(stage, section.key));
            const records = questions.map((question) => ({ id: getQuestionProgressId(question) }));
            window.getLearningProgressByStage = async (requestedStage) => Number(requestedStage) === stage ? records : [];
            window.selectionStep = 'stage';
            await renderSectionButtons();
            return { questionCount: questions.length, uniqueCount: new Set(records.map((record) => record.id)).size };
        });
        if (stageFixture.questionCount !== 250 || stageFixture.uniqueCount !== 250) {
            throw new Error(`stage completion fixture must contain 250 unique questions: ${JSON.stringify(stageFixture)}`);
        }
        if (await page.locator('.stage-select-btn').count() !== 10) throw new Error('stage screen must contain 10 stage cards');
        if (await page.locator('.completed-stage-btn').count() !== 1) throw new Error('only the fully learned stage should celebrate');
        if (await page.locator('.completed-stage-btn .progress-complete-confetti').count() !== 1) {
            throw new Error('completed stage card is missing its private confetti canvas');
        }
        await assertCanvasHasParticles(page, '.completed-stage-btn .progress-complete-confetti', 'stage completion');
        if (process.env.TENTEN_STAGE_CELEBRATION_CAPTURE) {
            await page.screenshot({ path: process.env.TENTEN_STAGE_CELEBRATION_CAPTURE, fullPage: true });
        }

        const sectionFixture = await page.evaluate(async () => {
            resetCompletionCardCelebrations();
            const stage = 1;
            const section = getAvailableSectionsByStage(stage)[0];
            const questions = getUniqueSectionQuestions(stage, section.key);
            const records = questions.map((question) => ({ id: getQuestionProgressId(question) }));
            window.getLearningProgressByStage = async (requestedStage) => Number(requestedStage) === stage ? records : [];
            window.selectedQuizCategory = String(stage);
            window.selectionStep = 'section';
            await renderSectionButtons();
            return { questionCount: questions.length, section: section.key };
        });
        if (sectionFixture.questionCount !== 25) {
            throw new Error(`section completion fixture must contain 25 questions: ${JSON.stringify(sectionFixture)}`);
        }
        if (await page.locator('.completed-section-btn').count() !== 1) throw new Error('only the fully learned section should celebrate');
        if (await page.locator('.completed-section-btn .progress-complete-confetti').count() !== 1) {
            throw new Error('completed section card is missing its private confetti canvas');
        }
        await assertCanvasHasParticles(page, '.completed-section-btn .progress-complete-confetti', 'section completion');

        console.log('OK: completing all 250 questions starts confetti inside the matching stage card');
        console.log('OK: the existing 25-question section celebration still works with the same bundled engine');
        console.log('OK: stage and section particles are drawn by the local canvas-confetti file');
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
