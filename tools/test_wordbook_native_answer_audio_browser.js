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

async function clearRecordedAudio(page) {
    await page.evaluate(() => { window.__tentenRecordedAudio = []; });
}

async function waitForSingleJapaneseAnswerAudio(page, label) {
    await page.waitForFunction(() => window.__tentenRecordedAudio.some((source) => source.includes('/audio/ja/')));
    const answerAudio = await page.evaluate(() => window.__tentenRecordedAudio.filter((source) => source.includes('/audio/ja/')));
    if (answerAudio.length !== 1) {
        throw new Error(`${label}: the Japanese native-language answer must play exactly once, received ${answerAudio.length}`);
    }
}

(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const origin = `http://127.0.0.1:${port}`;
    let browser;

    try {
        const executablePath = findBrowserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available for the wordbook browser test');
        browser = await chromium.launch({ headless: true, executablePath });
        const context = await browser.newContext({ viewport: { width: 430, height: 920 } });

        await context.addInitScript(() => {
            window.__tentenRecordedAudio = [];
            HTMLMediaElement.prototype.play = function playForTest() {
                window.__tentenRecordedAudio.push(String(this.src || ''));
                setTimeout(() => this.dispatchEvent(new Event('ended')), 35);
                return Promise.resolve();
            };
            HTMLMediaElement.prototype.pause = function pauseForTest() {};
        });

        const page = await context.newPage();
        await page.goto(`${origin}/?native=ja&learn=zh-CN`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof activeQuizData !== 'undefined' && Array.isArray(activeQuizData) && activeQuizData.length > 1);

        await page.evaluate(async () => {
            const firstStandardQuestion = activeQuizData.find((item) => Number(item.stage) === 1 && item.answerAudioFile);
            if (!firstStandardQuestion) throw new Error('A stage-one question with native answer audio is required');
            window.selectedQuizCategory = '1';
            window.selectedQuizSection = firstStandardQuestion.category;
            window.selectionStep = 'section';
            document.getElementById('section-select-screen').style.display = 'none';
            document.getElementById('quiz-card').style.display = 'block';
            await restartQuiz();
        });
        await page.waitForFunction(() => document.querySelectorAll('.option-btn:not([disabled])').length >= 2);

        await clearRecordedAudio(page);
        const correctStartIndex = await page.evaluate(() => currentIdx);
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('.option-btn'));
            const correctIndex = buttons.findIndex((button) => button.dataset.text === currentCorrectText);
            if (correctIndex < 0) throw new Error('No correct answer button is available');
            buttons[correctIndex].click();
        });
        await page.waitForFunction((startIndex) => currentIdx === startIndex + 1, correctStartIndex);
        const correctNativeAudioCount = await page.evaluate(() => (
            window.__tentenRecordedAudio.filter((source) => source.includes('/audio/ja/')).length
        ));
        if (correctNativeAudioCount !== 0) {
            throw new Error(`a correct standard answer must advance without native answer audio, received ${correctNativeAudioCount}`);
        }

        await clearRecordedAudio(page);
        const wrongStartIndex = await page.evaluate(() => currentIdx);
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('.option-btn'));
            const wrongIndex = buttons.findIndex((button) => button.dataset.text !== currentCorrectText);
            if (wrongIndex < 0) throw new Error('No incorrect standard answer button is available');
            buttons[wrongIndex].click();
        });
        await page.waitForSelector('#answer-reveal-overlay', { state: 'visible' });
        await waitForSingleJapaneseAnswerAudio(page, 'standard wrong answer');
        await page.waitForFunction((startIndex) => currentIdx === startIndex + 1, wrongStartIndex, { timeout: 8000 });

        await clearRecordedAudio(page);
        const timeoutStartIndex = await page.evaluate(() => currentIdx);
        await page.evaluate(() => handleTimeout());
        await page.waitForSelector('#answer-reveal-overlay', { state: 'visible' });
        await waitForSingleJapaneseAnswerAudio(page, 'standard timeout');
        await page.waitForFunction((startIndex) => currentIdx === startIndex + 1, timeoutStartIndex, { timeout: 8000 });

        const allModeAudioCounts = await page.evaluate(async () => {
            const question = activeQuizData.find((item) => Number(item.stage) === 1 && item.answerAudioFile);
            const standardSection = question.category;
            const modes = [standardSection, 'wrong_bank', 'my_wordbook', 'daily_quiz'];
            const counts = {};
            stopAutoRepeatSound();
            for (const mode of modes) {
                window.selectedQuizSection = mode;
                window.__tentenRecordedAudio = [];
                await playNativeAnswerAudio(question);
                counts[mode] = window.__tentenRecordedAudio.filter((source) => source.includes('/audio/ja/')).length;
            }
            return counts;
        });
        if (Object.values(allModeAudioCounts).some((count) => count !== 1)) {
            throw new Error(`native answer audio must be available in every quiz mode: ${JSON.stringify(allModeAudioCounts)}`);
        }

        await page.evaluate(async () => {
            stopActiveQuizFlow();
            document.getElementById('quiz-card').style.display = 'none';
            document.getElementById('section-select-screen').style.display = 'block';
            const words = activeQuizData.filter((item) => Number(item.stage) === 1).slice(0, 2);
            if (words.length !== 2) throw new Error('Two stage-one words are required for the wordbook test');
            for (const word of words) await addToWordbook(word);
            selectStage('1');
        });

        await page.waitForSelector('.wordbook-section-btn');
        await page.click('.wordbook-section-btn');
        await page.waitForFunction(() => (
            window.selectedQuizSection === 'my_wordbook' &&
            document.getElementById('quiz-card').style.display === 'block' &&
            document.querySelectorAll('.option-btn:not([disabled])').length >= 2
        ));

        const totalQuestions = await page.evaluate(() => TOTAL_QUESTIONS);
        if (totalQuestions !== 2) throw new Error(`wordbook must contain the two seeded words, received ${totalQuestions}`);

        await clearRecordedAudio(page);
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('.option-btn'));
            const wrongIndex = buttons.findIndex((button) => button.dataset.text !== currentCorrectText);
            if (wrongIndex < 0) throw new Error('No incorrect answer button is available');
            buttons[wrongIndex].click();
        });

        await page.waitForSelector('#answer-reveal-overlay', { state: 'visible' });
        const wrongRevealState = await page.evaluate(() => ({
            answer: document.querySelector('#answer-reveal-card .answer-reveal-meaning')?.textContent || '',
            expected: currentCorrectText,
            hasRevealAnimation: document.getElementById('answer-reveal-card').getAnimations().length > 0
        }));
        if (wrongRevealState.answer !== wrongRevealState.expected || !wrongRevealState.hasRevealAnimation) {
            throw new Error('wrong answer must preserve the existing pop-out answer reveal effect');
        }
        await waitForSingleJapaneseAnswerAudio(page, 'wrong answer');

        await page.waitForFunction(() => currentIdx === 1 && document.getElementById('answer-reveal-overlay').style.display === 'none', null, { timeout: 8000 });

        await clearRecordedAudio(page);
        await page.evaluate(() => handleTimeout());
        await page.waitForSelector('#answer-reveal-overlay', { state: 'visible' });
        const timeoutRevealState = await page.evaluate(() => ({
            answer: document.querySelector('#answer-reveal-card .answer-reveal-meaning')?.textContent || '',
            expected: currentCorrectText,
            hasRevealAnimation: document.getElementById('answer-reveal-card').getAnimations().length > 0
        }));
        if (timeoutRevealState.answer !== timeoutRevealState.expected || !timeoutRevealState.hasRevealAnimation) {
            throw new Error('timeout must preserve the existing pop-out answer reveal effect');
        }
        await waitForSingleJapaneseAnswerAudio(page, 'timeout');

        await page.waitForFunction(() => (
            currentIdx === 0 &&
            window.selectedQuizSection === 'my_wordbook' &&
            document.getElementById('quiz-card').style.display === 'block' &&
            document.getElementById('answer-reveal-overlay').style.display === 'none'
        ), null, { timeout: 8000 });

        console.log('OK: correct standard answers advance without native answer audio');
        console.log('OK: standard wrong answers and timeouts keep the reveal and play native answer audio once');
        console.log('OK: native answer audio is enabled for standard, wrong-bank, wordbook, and daily quiz modes');
        console.log('OK: a wrong wordbook answer keeps the pop-out reveal and plays the native-language answer once');
        console.log('OK: a wordbook timeout keeps the same reveal and plays the native-language answer once');
        console.log('OK: the wordbook advances automatically and loops back after its final word');
        await context.close();
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
