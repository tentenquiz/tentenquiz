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

async function answerCurrentQuestion(page, correct) {
    await page.waitForFunction(() => typeof isClickable !== 'undefined' && isClickable === true);
    await page.evaluate(async (shouldBeCorrect) => {
        const buttons = Array.from(document.querySelectorAll('.option-btn'));
        const correctIndex = buttons.findIndex((button) => button.getAttribute('data-text') === currentCorrectText);
        const selectedIndex = shouldBeCorrect
            ? correctIndex
            : buttons.findIndex((button, index) => index !== correctIndex && button.getAttribute('data-text') !== currentCorrectText);
        if (selectedIndex < 0) throw new Error('answer option was not found');
        await checkAnswer(selectedIndex);
        cancelScheduledQuestionAdvance();
        hideAnswerRevealPopup();
        goToNextQuestion();
    }, correct);
}

async function getDailyStorage(page) {
    return page.evaluate(() => {
        const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('tenten.dailyQuiz.v1.'));
        return { key, session: key ? JSON.parse(localStorage.getItem(key)) : null };
    });
}

(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    let browser;
    try {
        const executablePath = findBrowserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available for the daily quiz test');
        browser = await chromium.launch({ headless: true, executablePath });
        const context = await browser.newContext({ viewport: { width: 430, height: 920 } });
        const page = await context.newPage();
        const firebaseRequests = [];
        page.on('request', (request) => {
            if (/firestore|firebaseio|firebaseapp|googleapis\.com\/.*firestore/i.test(request.url())) {
                firebaseRequests.push(request.url());
            }
        });
        await page.addInitScript(() => {
            window.__dailyTestOnline = true;
            Object.defineProperty(navigator, 'onLine', {
                configurable: true,
                get: () => window.__dailyTestOnline
            });
            window.__dailySectionCompletionEvents = 0;
            window.__dailyAchievementEvents = 0;
            window.__dailyCloudWrites = [];
            window.__TENTEN_FIRESTORE_TEST_ADAPTER__ = {
                putBackup: async (payload) => {
                    window.__dailyCloudWrites.push(payload);
                    return { revision: `daily-test-${window.__dailyCloudWrites.length}` };
                },
                getBackup: async () => { throw new Error('daily test does not restore'); },
                deleteBackup: async () => {}
            };
            window.addEventListener('tenten-section-completed', () => {
                window.__dailySectionCompletionEvents += 1;
            });
            window.addEventListener('tenten-daily-quiz-completed', () => {
                window.__dailyAchievementEvents += 1;
            });
        });
        await page.goto(`http://127.0.0.1:${port}/?native=ko&learn=en`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.stage-select-btn');
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');

        const fixture = await page.evaluate(async () => {
            const questions = getUniqueSectionQuestions(1, getAvailableSectionsByStage(1)[0].key).slice(0, 10);
            for (const item of questions.slice(0, 4)) await addOrUpdateWrong(item);
            for (const item of questions.slice(4, 6)) await addToWordbook(item);
            for (const item of questions.slice(6, 10)) await markQuestionLearned(item);
            return {
                wrong: questions.slice(0, 4).map(getDailyQuizQuestionKey),
                wordbook: questions.slice(4, 6).map(getDailyQuizQuestionKey),
                learned: questions.slice(6, 10).map(getDailyQuizQuestionKey)
            };
        });

        if (process.env.TENTEN_DAILY_BANNER_CAPTURE) {
            await page.locator('#section-select-screen').screenshot({ path: process.env.TENTEN_DAILY_BANNER_CAPTURE });
        }

        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => document.getElementById('quiz-card').style.display === 'block');
        const firstSession = await getDailyStorage(page);
        if (!firstSession.key || firstSession.session.questionKeys.length !== 10) {
            throw new Error('daily quiz must save exactly 10 local question keys');
        }
        const questionSet = new Set(firstSession.session.questionKeys);
        for (const [label, keys] of Object.entries(fixture)) {
            const count = keys.filter((key) => questionSet.has(key)).length;
            if (count !== keys.length) throw new Error(`daily quiz omitted planned ${label} questions: ${count}/${keys.length}`);
        }

        await page.evaluate(() => {
            const original = window.confetti;
            const wrapped = (...args) => {
                window.__dailyConfettiCalls = (window.__dailyConfettiCalls || 0) + 1;
                return original(...args);
            };
            Object.assign(wrapped, original);
            window.confetti = wrapped;
            window.__dailyConfettiCalls = 0;
        });

        await answerCurrentQuestion(page, true);
        await answerCurrentQuestion(page, true);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');
        if (!(await page.locator('#daily-quiz-status').innerText()).includes('3/10')) {
            throw new Error('daily banner did not preserve the next question after reload');
        }
        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => document.getElementById('progress-text').textContent.includes('3 / 10'));

        await page.evaluate(() => {
            const original = window.confetti;
            const wrapped = (...args) => {
                window.__dailyConfettiCalls = (window.__dailyConfettiCalls || 0) + 1;
                return original(...args);
            };
            Object.assign(wrapped, original);
            window.confetti = wrapped;
            window.__dailyConfettiCalls = 0;
        });

        await answerCurrentQuestion(page, false);
        for (let index = 0; index < 7; index += 1) await answerCurrentQuestion(page, true);
        await page.waitForFunction(() => document.getElementById('result-card').style.display === 'block');
        if ((await page.locator('#score-text').innerText()).trim() !== '9') throw new Error('first daily attempt must end at 9/10');
        if (await page.locator('#result-retry-wrap').isHidden()) throw new Error('same-question retry button must show before a perfect score');
        if ((await page.locator('#restart-stage-btn').innerText()).trim() !== '🔄 같은 문제 다시 풀기') {
            throw new Error('daily retry button label is incorrect');
        }
        const buttonSizes = await page.evaluate(() => {
            const retry = document.getElementById('restart-stage-btn').getBoundingClientRect();
            const share = document.getElementById('share-result-btn').getBoundingClientRect();
            return { retryWidth: retry.width, retryHeight: retry.height, shareWidth: share.width, shareHeight: share.height };
        });
        if (Math.abs(buttonSizes.retryWidth - buttonSizes.shareWidth) > 1 || Math.abs(buttonSizes.retryHeight - buttonSizes.shareHeight) > 1) {
            throw new Error(`daily retry button must match existing result button size: ${JSON.stringify(buttonSizes)}`);
        }
        if (await page.evaluate(() => window.__dailyConfettiCalls) !== 0) {
            throw new Error('confetti must not run before the daily quiz reaches 10/10');
        }
        const failedSession = await getDailyStorage(page);
        if (failedSession.session.cleared || failedSession.session.lastScore !== 9) {
            throw new Error('non-perfect daily attempt was incorrectly marked clear');
        }
        const originalQuestionKeys = JSON.stringify(failedSession.session.questionKeys);
        if (process.env.TENTEN_DAILY_RESULT_CAPTURE) {
            await page.locator('#result-card').screenshot({ path: process.env.TENTEN_DAILY_RESULT_CAPTURE });
        }

        await page.click('#restart-stage-btn');
        await page.waitForFunction(() => document.getElementById('progress-text').textContent.includes('1 / 10'));
        const retrySession = await getDailyStorage(page);
        if (JSON.stringify(retrySession.session.questionKeys) !== originalQuestionKeys) {
            throw new Error('same-question retry changed the stored 10 questions');
        }
        for (let index = 0; index < 10; index += 1) await answerCurrentQuestion(page, true);
        await page.waitForFunction(() => document.getElementById('result-card').style.display === 'block');
        if ((await page.locator('#score-text').innerText()).trim() !== '10') throw new Error('retry must finish at 10/10');
        if (!(await page.locator('#result-retry-wrap').isHidden())) throw new Error('retry button must hide after a perfect score');
        if (await page.evaluate(() => window.__dailyConfettiCalls) < 1) throw new Error('perfect daily score did not launch confetti');

        const clearedSession = await getDailyStorage(page);
        if (!clearedSession.session.cleared || clearedSession.session.lastScore !== 10) {
            throw new Error('10/10 daily attempt did not persist the local clear state');
        }
        const achievementState = await page.evaluate(async () => {
            const achievement = readDailyQuizAchievement('ko', 'en');
            const payload = await window.TentenLearningRecords.createBackupPayload();
            return {
                achievement,
                backupAchievements: payload.dailyQuizAchievements,
                eventCount: window.__dailyAchievementEvents
            };
        });
        if (
            achievementState.achievement.currentStreak !== 1
            || achievementState.achievement.bestStreak !== 1
            || achievementState.achievement.totalClearDays !== 1
            || achievementState.backupAchievements.length !== 1
            || achievementState.eventCount !== 1
        ) {
            throw new Error(`perfect score did not create one backed-up achievement: ${JSON.stringify(achievementState)}`);
        }

        await page.waitForFunction(() => window.__dailyCloudWrites.length === 1, null, { timeout: 8000 });
        await page.evaluate(() => completeDailyQuizAttempt(10));
        await page.waitForTimeout(1500);
        const duplicateState = await page.evaluate(() => ({
            achievement: readDailyQuizAchievement('ko', 'en'),
            writes: window.__dailyCloudWrites.length,
            events: window.__dailyAchievementEvents
        }));
        if (duplicateState.achievement.totalClearDays !== 1 || duplicateState.writes !== 1 || duplicateState.events !== 1) {
            throw new Error(`same-day completion was counted or uploaded twice: ${JSON.stringify(duplicateState)}`);
        }

        await page.evaluate(() => {
            const dialog = document.getElementById('cloud-backup-recovery-dialog');
            if (dialog?.open) dialog.close();
        });
        await page.click('#result-back-all-btn');
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');
        if ((await page.locator('#daily-quiz-status').innerText()).trim() !== '✓ 1일 달성') {
            throw new Error('main banner did not switch to the first-day achievement state');
        }
        if (!(await page.locator('#daily-quiz-subtitle').innerText()).includes('최고 기록 1일')) {
            throw new Error('cleared banner did not show the best streak');
        }
        const celebrationState = await page.evaluate(() => ({
            hasCanvas: Boolean(document.querySelector('#daily-quiz-banner .daily-quiz-confetti')),
            iconSource: document.querySelector('.daily-quiz-icon-image')?.getAttribute('src') || '',
            mode: document.getElementById('daily-quiz-banner').dataset.celebrationMode
        }));
        if (!celebrationState.hasCanvas || celebrationState.iconSource !== 'assets/ui/daily-quiz-spark.svg' || celebrationState.mode !== 'cleared') {
            throw new Error(`daily banner celebration is incomplete: ${JSON.stringify(celebrationState)}`);
        }
        if (process.env.TENTEN_DAILY_CLEARED_BANNER_CAPTURE) {
            await page.locator('#daily-quiz-banner').screenshot({
                path: process.env.TENTEN_DAILY_CLEARED_BANNER_CAPTURE
            });
        }

        const localStoreCounts = await page.evaluate(async () => ({
            wrong: (await dbGetAll(STORE_WRONG)).length,
            wordbook: (await dbGetAll(STORE_WORDBOOK)).length,
            progress: (await dbGetAll(STORE_PROGRESS)).length,
            sectionEvents: window.__dailySectionCompletionEvents
        }));
        if (localStoreCounts.wrong !== 0 || localStoreCounts.wordbook !== 2 || localStoreCounts.progress !== 4) {
            throw new Error(`daily results must update only existing local wrong/wordbook data and never learning progress: ${JSON.stringify(localStoreCounts)}`);
        }
        if (localStoreCounts.sectionEvents !== 0 || firebaseRequests.length !== 0) {
            throw new Error(`daily quiz must use its own backup event and test adapter: sectionEvents=${localStoreCounts.sectionEvents}, networkRequests=${firebaseRequests.length}`);
        }

        const streakRules = await page.evaluate(() => {
            const base = emptyDailyQuizAchievement('ko', 'en');
            const dayOne = calculateDailyQuizAchievement(base, '2026-08-18', 1, 'Asia/Seoul').achievement;
            const dayTwo = calculateDailyQuizAchievement(dayOne, '2026-08-19', 2, 'Asia/Seoul').achievement;
            const duplicate = calculateDailyQuizAchievement(dayTwo, '2026-08-19', 3, 'Asia/Seoul');
            const afterGap = calculateDailyQuizAchievement(dayTwo, '2026-08-21', 4, 'Asia/Seoul').achievement;
            const otherPair = readDailyQuizAchievement('ko', 'ja');
            return { dayOne, dayTwo, duplicate, afterGap, otherPair };
        });
        if (
            streakRules.dayOne.currentStreak !== 1
            || streakRules.dayTwo.currentStreak !== 2
            || streakRules.dayTwo.bestStreak !== 2
            || streakRules.duplicate.isNew
            || streakRules.afterGap.currentStreak !== 1
            || streakRules.afterGap.bestStreak !== 2
            || streakRules.otherPair.totalClearDays !== 0
        ) {
            throw new Error(`daily streak rules or language-pair isolation failed: ${JSON.stringify(streakRules)}`);
        }

        await page.evaluate(() => {
            window.__dailyTestOnline = false;
            window.tentenGlobal.learningLanguage = 'ja';
            recordDailyQuizAchievement(new Date());
        });
        await page.waitForFunction(() => {
            const profile = window.TentenCloudBackup.readProfile();
            return profile?.pendingMilestones?.some((id) => id.startsWith('daily:ko:ja:'));
        });
        if (await page.evaluate(() => window.__dailyCloudWrites.length) !== 1) {
            throw new Error('offline daily achievement attempted an immediate cloud write');
        }
        await page.evaluate(() => {
            window.__dailyTestOnline = true;
            window.dispatchEvent(new Event('online'));
        });
        await page.waitForFunction(() => (
            window.__dailyCloudWrites.length === 2
            && window.TentenCloudBackup.readProfile()?.pendingMilestones?.length === 0
        ), null, { timeout: 8000 });
        await page.evaluate(() => { window.tentenGlobal.learningLanguage = 'en'; });

        const rollover = await page.evaluate(() => {
            const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('tenten.dailyQuiz.v1.'));
            const previous = JSON.parse(localStorage.getItem(key));
            previous.dateKey = '2000-01-01';
            previous.cleared = true;
            previous.attempts = 99;
            localStorage.setItem(key, JSON.stringify(previous));
            activeDailyQuizSession = null;
            updateDailyQuizBanner();
            return { key, previousCreatedAt: previous.createdAt };
        });
        if ((await page.locator('#daily-quiz-status').innerText()).trim() !== '첫 기록에 도전 →') {
            throw new Error('an expired local date must return the banner to a new-day state');
        }
        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => {
            const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('tenten.dailyQuiz.v1.'));
            if (!key) return false;
            const session = JSON.parse(localStorage.getItem(key));
            return session?.dateKey && session.dateKey !== '2000-01-01';
        });
        const renewedSession = await getDailyStorage(page);
        if (
            renewedSession.session.dateKey === '2000-01-01' ||
            renewedSession.session.cleared ||
            renewedSession.session.attempts !== 0
        ) {
            throw new Error(`date rollover did not create a fresh local daily quiz: ${JSON.stringify(renewedSession.session)}`);
        }

        console.log('OK: daily quiz uses the planned 4/2/2/2 local review composition and keeps the same 10 questions');
        console.log('OK: reload resumes progress, 9/10 shows an equal-size retry button, and only 10/10 launches confetti');
        console.log('OK: perfect score creates a first-day streak, best record, local celebration, and encrypted backup payload');
        console.log('OK: same-day clears never duplicate the streak or cloud write, while consecutive and gap rules stay correct');
        console.log('OK: daily achievements remain isolated by native-learning language pair and use their own cloud event');
        console.log('OK: offline daily achievements stay queued and upload once when connectivity returns');
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
