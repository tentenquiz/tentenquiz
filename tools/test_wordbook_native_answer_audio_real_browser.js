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

async function verifyNativeAnswerPlayback(browser, origin, nativeLanguage, learningLanguage, expectedFolder, trigger) {
    const context = await browser.newContext({ viewport: { width: 430, height: 920 } });
    await context.addInitScript(() => {
        window.__tentenMediaEvents = [];
        const originalPlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function playWithDiagnostics(...args) {
            const media = this;
            const record = (type, extra = {}) => {
                window.__tentenMediaEvents.push({
                    type,
                    src: String(type === 'play-call' ? (media.src || media.currentSrc || '') : (media.currentSrc || media.src || '')),
                    errorCode: media.error ? media.error.code : 0,
                    ...extra
                });
            };
            record('play-call');
            ['playing', 'ended', 'error'].forEach((eventName) => {
                media.addEventListener(eventName, () => record(eventName), { once: true });
            });
            const playPromise = originalPlay.apply(media, args);
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch((error) => record('play-rejected', { message: String(error && error.message || error) }));
            }
            return playPromise;
        };
    });

    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(`${origin}/?native=${encodeURIComponent(nativeLanguage)}&learn=${encodeURIComponent(learningLanguage)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof activeQuizData !== 'undefined' && activeQuizData.length > 0);

    await page.evaluate(async () => {
        const word = activeQuizData.find((item) => Number(item.stage) === 1);
        if (!word) throw new Error('A stage-one word is required');
        const legacyWordbookItem = {
            id: word.id,
            stage: word.stage,
            category: word.category,
            section: word.section,
            hanzi: word.hanzi,
            reading: word.reading,
            pinyin: word.pinyin,
            meaning: word.meaning,
            note: word.note,
            audioFile: word.audioFile,
            isGlobalData: word.isGlobalData,
            learningLanguage: word.learningLanguage,
            interfaceLanguage: word.interfaceLanguage
        };
        await addToWordbook(legacyWordbookItem);
        selectStage('1');
    });
    await page.waitForSelector('.wordbook-section-btn');
    await page.click('.wordbook-section-btn');
    await page.waitForFunction(() => (
        window.selectedQuizSection === 'my_wordbook' &&
        typeof shuffledQuestions !== 'undefined' &&
        shuffledQuestions.length > 0 &&
        Boolean(shuffledQuestions[currentIdx]) &&
        Boolean(currentCorrectText) &&
        document.querySelectorAll('.option-btn:not([disabled])').length >= 2
    ));

    const expectedAnswerAudio = await page.evaluate(() => shuffledQuestions[currentIdx].answerAudioFile);
    if (!expectedAnswerAudio || !expectedAnswerAudio.includes(`audio/${expectedFolder}/`)) {
        throw new Error(`${nativeLanguage}: wrong native answer audio mapping: ${expectedAnswerAudio}`);
    }

    await page.evaluate(() => { window.__tentenMediaEvents = []; });
    if (trigger === 'timeout') {
        await page.evaluate(() => handleTimeout());
    } else {
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('.option-btn'));
            const wrongButton = buttons.find((button) => button.dataset.text !== currentCorrectText);
            if (!wrongButton) throw new Error('No incorrect answer is available');
            wrongButton.click();
        });
    }

    try {
        await page.waitForFunction((audioPath) => window.__tentenMediaEvents.some((event) => (
            event.type === 'playing' && decodeURIComponent(event.src).endsWith(audioPath)
        )), expectedAnswerAudio, { timeout: 10000 });
    } catch (error) {
        const diagnostic = await page.evaluate(() => ({
            events: window.__tentenMediaEvents,
            selectedSection: window.selectedQuizSection,
            soundEnabled: isSoundEnabled,
            currentSource: currentAudio ? String(currentAudio.currentSrc || currentAudio.src || '') : '',
            currentError: currentAudio && currentAudio.error ? currentAudio.error.code : 0,
            paused: currentAudio ? currentAudio.paused : null
        }));
        throw new Error(`${nativeLanguage}: native answer did not start: ${JSON.stringify(diagnostic)}`, { cause: error });
    }
    await page.waitForFunction((audioPath) => window.__tentenMediaEvents.some((event) => (
        event.type === 'ended' && decodeURIComponent(event.src).endsWith(audioPath)
    )), expectedAnswerAudio, { timeout: 10000 });

    const answerEvents = await page.evaluate((audioPath) => window.__tentenMediaEvents.filter((event) => (
        decodeURIComponent(event.src).endsWith(audioPath)
    )), expectedAnswerAudio);
    const playCount = answerEvents.filter((event) => event.type === 'play-call').length;
    const errors = answerEvents.filter((event) => event.type === 'error' || event.type === 'play-rejected');
    if (playCount !== 1 || errors.length || pageErrors.length) {
        throw new Error(`${nativeLanguage}: actual answer playback failed: ${JSON.stringify({ answerEvents, pageErrors })}`);
    }

    await context.close();
    return expectedAnswerAudio;
}

(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const origin = `http://127.0.0.1:${port}`;
    let browser;

    try {
        const executablePath = findBrowserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available for the real audio test');
        browser = await chromium.launch({ headless: true, executablePath });

        const englishAudio = await verifyNativeAnswerPlayback(browser, origin, 'en', 'ja', 'en', 'wrong');
        const japaneseAudio = await verifyNativeAnswerPlayback(browser, origin, 'ja', 'zh-CN', 'ja', 'timeout');

        console.log(`OK: an old English wordbook entry really played and ended its English MP3 after a wrong answer (${englishAudio})`);
        console.log(`OK: an old Japanese wordbook entry really played and ended its Japanese MP3 after a timeout (${japaneseAudio})`);
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
