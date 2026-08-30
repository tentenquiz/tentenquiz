const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const projectRoot = path.resolve(__dirname, '..');
const screenshotDir = String(process.env.TENTEN_UI_SCREENSHOT_DIR || '').trim();
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

async function captureDailyCardScreens(page, name) {
    if (!screenshotDir) return;
    fs.mkdirSync(screenshotDir, { recursive: true });
    const originalViewport = page.viewportSize();
    for (const viewport of [{ label: 'mobile', width: 390, height: 844 }, { label: 'pc', width: 1280, height: 900 }]) {
        await page.setViewportSize(viewport);
        await page.screenshot({ path: path.join(screenshotDir, `${name}-${viewport.label}.png`), fullPage: false });
    }
    if (originalViewport) await page.setViewportSize(originalViewport);
}

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

async function answerDailyGame(page, wrongQuestionKeys = []) {
    const wrongKeys = new Set(wrongQuestionKeys);
    const remaining = await page.evaluate(() => TOTAL_QUESTIONS - currentIdx);
    for (let index = 0; index < remaining; index += 1) {
        const questionKey = await page.evaluate(() => getDailyQuizQuestionKey(shuffledQuestions[currentIdx]));
        await answerCurrentQuestion(page, !wrongKeys.has(questionKey));
    }
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
        let page = await context.newPage();
        const firebaseRequests = [];
        page.on('request', (request) => {
            if (/firestore|firebaseio|firebaseapp|googleapis\.com\/.*firestore/i.test(request.url())) {
                firebaseRequests.push(request.url());
            }
        });
        await context.addInitScript(() => {
            window.__dailyTestOnline = true;
            window.__TENTEN_DAILY_QUIZ_BACKUP_DELAY_MS__ = 3000;
            window.__dailyCloudFailureCode = '';
            window.__dailyCloudAttempts = [];
            Object.defineProperty(navigator, 'onLine', {
                configurable: true,
                get: () => window.__dailyTestOnline
            });
            window.__dailySectionCompletionEvents = 0;
            window.__dailyAchievementEvents = 0;
            window.__dailyAchievementDetails = [];
            window.__dailyCloudWrites = [];
            window.__TENTEN_FIRESTORE_TEST_ADAPTER__ = {
                putBackup: async (payload) => {
                    window.__dailyCloudAttempts.push(payload);
                    if (window.__dailyCloudFailureCode) {
                        const error = new Error(`simulated ${window.__dailyCloudFailureCode}`);
                        error.code = window.__dailyCloudFailureCode;
                        throw error;
                    }
                    window.__dailyCloudWrites.push(payload);
                    return { revision: `daily-test-${window.__dailyCloudWrites.length}` };
                },
                getBackup: async () => { throw new Error('daily test does not restore'); },
                deleteBackup: async () => {}
            };
            window.addEventListener('tenten-section-completed', () => {
                window.__dailySectionCompletionEvents += 1;
            });
            window.addEventListener('tenten-daily-quiz-completed', (event) => {
                window.__dailyAchievementEvents += 1;
                window.__dailyAchievementDetails.push(event.detail);
            });
        });
        await page.goto(`http://127.0.0.1:${port}/?native=ko&learn=en`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.stage-select-btn');
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');
        await captureDailyCardScreens(page, '01-start');

        for (const viewport of [
            { width: 320, height: 700 },
            { width: 390, height: 844 },
            { width: 480, height: 900 },
            { width: 1280, height: 900 }
        ]) {
            await page.setViewportSize(viewport);
            const cardStyle = await page.evaluate(() => {
                const daily = document.getElementById('daily-quiz-banner');
                const stage = document.querySelector('.stage-select-btn');
                const status = document.getElementById('daily-quiz-status');
                const subtitle = document.getElementById('daily-quiz-subtitle');
                const wordCount = subtitle.querySelector('.daily-quiz-word-count');
                const copy = daily.querySelector('.daily-quiz-copy');
                const title = daily.querySelector('.daily-quiz-copy strong');
                const dailyRect = daily.getBoundingClientRect();
                const stageRect = stage.getBoundingClientRect();
                const copyRect = copy.getBoundingClientRect();
                const statusRect = status.getBoundingClientRect();
                const dailyCss = getComputedStyle(daily);
                const statusCss = getComputedStyle(status);
                return {
                    dailyHeight: dailyRect.height,
                    ratio: dailyRect.height / stageRect.height,
                    gapToStage: stageRect.top - dailyRect.bottom,
                    display: dailyCss.display,
                    background: dailyCss.backgroundImage,
                    borderColor: dailyCss.borderColor,
                    titleColor: getComputedStyle(title).color,
                    statusBackground: statusCss.backgroundImage,
                    statusText: status.textContent.trim(),
                    subtitleText: subtitle.textContent.trim(),
                    wordCountText: wordCount?.textContent || '',
                    wordCountColor: wordCount ? getComputedStyle(wordCount).color : '',
                    wordCountFontSize: wordCount ? Number.parseFloat(getComputedStyle(wordCount).fontSize) : 0,
                    subtitleFontSize: Number.parseFloat(getComputedStyle(subtitle).fontSize),
                    wordCountWeight: wordCount ? Number(getComputedStyle(wordCount).fontWeight) : 0,
                    statusWidth: statusRect.width,
                    statusMinWidth: statusCss.minWidth,
                    statusWhiteSpace: statusCss.whiteSpace,
                    stateClasses: ['is-learning', 'is-perfect-target', 'is-cleared'].filter((name) => daily.classList.contains(name)),
                    statusCenterOffset: ((statusRect.top + statusRect.bottom) - (dailyRect.top + dailyRect.bottom)) / 2,
                    statusRightInset: dailyRect.right - statusRect.right,
                    statusLeft: statusRect.left,
                    statusTop: statusRect.top,
                    copyLeft: copyRect.left,
                    copyRight: copyRect.right,
                    copyBottom: copyRect.bottom
                };
            });
            if (cardStyle.ratio < 0.9 || cardStyle.ratio > 1.1) {
                throw new Error(`daily/stage card height ratio is out of range at ${viewport.width}px: ${JSON.stringify(cardStyle)}`);
            }
            const expectedHeight = viewport.width <= 420 ? 101 : 105;
            if (Math.abs(cardStyle.dailyHeight - expectedHeight) > 1) {
                throw new Error(`daily card height changed unexpectedly at ${viewport.width}px: ${JSON.stringify(cardStyle)}`);
            }
            if (cardStyle.gapToStage < 0 || cardStyle.gapToStage > 21) {
                throw new Error(`daily card pushed the stage grid unexpectedly at ${viewport.width}px: ${JSON.stringify(cardStyle)}`);
            }
            if (
                cardStyle.display !== 'grid' ||
                !cardStyle.background.includes('rgb(241, 250, 245)') ||
                !cardStyle.borderColor.includes('47, 118, 90') ||
                cardStyle.titleColor !== 'rgb(37, 104, 77)' ||
                !cardStyle.statusBackground.includes('rgb(91, 163, 130)') ||
                cardStyle.statusText !== '시작하기' ||
                cardStyle.subtitleText !== '오늘의 단어 12개에 도전하세요!' ||
                cardStyle.wordCountText !== '12' ||
                cardStyle.wordCountColor !== 'rgb(35, 101, 58)' ||
                cardStyle.wordCountWeight < 900 ||
                cardStyle.wordCountFontSize !== cardStyle.subtitleFontSize ||
                cardStyle.stateClasses.length !== 0 ||
                cardStyle.statusWidth < 78 ||
                cardStyle.statusMinWidth !== '78px' ||
                cardStyle.statusWhiteSpace !== 'nowrap'
            ) {
                throw new Error(`daily card start state is incomplete at ${viewport.width}px: ${JSON.stringify(cardStyle)}`);
            }
            if (viewport.width > 340) {
                if (
                    Math.abs(cardStyle.statusCenterOffset) > 1 ||
                    cardStyle.statusRightInset < 11 ||
                    cardStyle.statusRightInset > 18 ||
                    cardStyle.statusLeft < cardStyle.copyRight + 9
                ) {
                    throw new Error(`daily CTA is not right-aligned and vertically centered at ${viewport.width}px: ${JSON.stringify(cardStyle)}`);
                }
            } else if (
                cardStyle.statusTop < cardStyle.copyBottom + 5 ||
                Math.abs(cardStyle.statusLeft - cardStyle.copyLeft) > 1
            ) {
                throw new Error(`daily CTA narrow-screen fallback is incomplete at ${viewport.width}px: ${JSON.stringify(cardStyle)}`);
            }

            const localizedLayouts = await page.evaluate((languages) => {
                const daily = document.getElementById('daily-quiz-banner');
                const copy = daily.querySelector('.daily-quiz-copy');
                const title = copy.querySelector('strong');
                const subtitle = document.getElementById('daily-quiz-subtitle');
                const detail = document.getElementById('daily-quiz-detail');
                const status = document.getElementById('daily-quiz-status');
                return languages.flatMap((language) => {
                    window.tentenGlobal.interfaceLanguage = language;
                    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
                    return [
                        {
                            state: 'start',
                            title: window.tentenT('dailyQuizTitle'),
                            subtitle: window.tentenT('dailyQuizSubtitle'),
                            status: window.tentenT('dailyQuizFirstChallenge')
                        },
                        {
                            state: 'remaining',
                            title: window.tentenT('dailyQuizTitle'),
                            subtitle: window.tentenT('dailyQuizWordsRemaining', { count: 2 }),
                            detail: '',
                            status: window.tentenT('dailyQuizContinueLearning')
                        },
                        {
                            state: 'all-words',
                            title: window.tentenT('dailyQuizTitle'),
                            subtitle: window.tentenT('dailyQuizPerfectPrompt'),
                            detail: '',
                            status: window.tentenT('dailyQuizRetryAction')
                        },
                        {
                            state: 'cleared',
                            title: window.tentenT('dailyQuizTitle'),
                            subtitle: window.tentenT('dailyQuizCompletedSubtitle', { count: 1 }),
                            detail: '',
                            status: window.tentenT('dailyQuizOneDayAchieved')
                        }
                    ].map((content) => {
                        daily.classList.toggle('is-cleared', content.state === 'cleared');
                        daily.classList.toggle('is-learning', content.state === 'remaining');
                        daily.classList.toggle('is-perfect-target', content.state === 'all-words');
                        title.textContent = content.title;
                        if (content.state === 'start') {
                            renderDailyQuizStartSubtitle(subtitle);
                        } else {
                            subtitle.textContent = content.subtitle;
                        }
                        detail.textContent = content.detail || '';
                        detail.hidden = !content.detail;
                        status.textContent = content.status;
                        const dailyRect = daily.getBoundingClientRect();
                        const copyRect = copy.getBoundingClientRect();
                        const titleRect = title.getBoundingClientRect();
                        const subtitleRect = subtitle.getBoundingClientRect();
                        const detailRect = detail.getBoundingClientRect();
                        const statusRect = status.getBoundingClientRect();
                        const wordCount = subtitle.querySelector('.daily-quiz-word-count');
                        const sameRow = statusRect.top < copyRect.bottom && statusRect.bottom > copyRect.top;
                        return {
                            language,
                            state: content.state,
                            cardHeight: dailyRect.height,
                            cardOverflowX: daily.scrollWidth - daily.clientWidth,
                            cardOverflowY: daily.scrollHeight - daily.clientHeight,
                            statusOverflowX: status.scrollWidth - status.clientWidth,
                            detailOverflowX: detail.hidden ? 0 : detail.scrollWidth - detail.clientWidth,
                            titleDescriptionGap: subtitleRect.top - titleRect.bottom,
                            descriptionDetailGap: detail.hidden ? 0 : detailRect.top - subtitleRect.bottom,
                            subtitleWeight: Number(getComputedStyle(subtitle).fontWeight),
                            subtitleFontSize: Number.parseFloat(getComputedStyle(subtitle).fontSize),
                            wordCountText: wordCount?.textContent || '',
                            wordCountWeight: wordCount ? Number(getComputedStyle(wordCount).fontWeight) : 0,
                            wordCountFontSize: wordCount ? Number.parseFloat(getComputedStyle(wordCount).fontSize) : 0,
                            wordCountColor: wordCount ? getComputedStyle(wordCount).color : '',
                            detailWeight: detail.hidden ? 0 : Number(getComputedStyle(detail).fontWeight),
                            subtitleColor: getComputedStyle(subtitle).color,
                            detailColor: detail.hidden ? '' : getComputedStyle(detail).color,
                            sameRow,
                            horizontalGap: statusRect.left - copyRect.right,
                            verticalGap: statusRect.top - copyRect.bottom,
                            statusCenterOffset: ((statusRect.top + statusRect.bottom) - (dailyRect.top + dailyRect.bottom)) / 2,
                            statusRightInset: dailyRect.right - statusRect.right
                        };
                    });
                });
            }, ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'fr', 'de', 'es', 'vi', 'ar', 'it', 'ru']);
            const localizedFailure = localizedLayouts.find((layout) => (
                layout.cardOverflowX > 1 ||
                layout.cardOverflowY > 1 ||
                layout.statusOverflowX > 1 ||
                layout.detailOverflowX > 1 ||
                Math.abs(layout.titleDescriptionGap - 6) > 1 ||
                (layout.state === 'start' && (
                    layout.wordCountText !== '12'
                    || layout.wordCountWeight < 900
                    || layout.wordCountFontSize !== layout.subtitleFontSize
                    || layout.wordCountColor !== 'rgb(35, 101, 58)'
                )) ||
                (layout.state === 'remaining' && (layout.subtitleWeight < 800 || layout.subtitleColor !== 'rgb(53, 107, 86)')) ||
                (layout.state === 'all-words' && (layout.subtitleWeight < 900 || layout.subtitleFontSize < 14 || layout.subtitleColor !== 'rgb(35, 101, 58)')) ||
                (viewport.width > 340
                    ? (!layout.sameRow || layout.horizontalGap < 9 || Math.abs(layout.statusCenterOffset) > 1 || layout.statusRightInset < 11 || layout.statusRightInset > 18)
                    : (layout.sameRow || layout.verticalGap < 5))
            ));
            if (localizedFailure) {
                throw new Error(`localized daily card overflow or alignment failed at ${viewport.width}px: ${JSON.stringify(localizedFailure)}`);
            }
            await page.evaluate(() => {
                window.tentenGlobal.interfaceLanguage = 'ko';
                document.documentElement.dir = 'ltr';
                const daily = document.getElementById('daily-quiz-banner');
                daily.classList.remove('is-cleared', 'is-learning', 'is-perfect-target');
                daily.querySelector('.daily-quiz-copy strong').textContent = window.tentenT('dailyQuizTitle');
                renderDailyQuizStartSubtitle(document.getElementById('daily-quiz-subtitle'));
                const detail = document.getElementById('daily-quiz-detail');
                detail.textContent = '';
                detail.hidden = true;
                document.getElementById('daily-quiz-status').textContent = window.tentenT('dailyQuizFirstChallenge');
            });
            await page.waitForTimeout(200);
        }
        const languageCodes = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'fr', 'de', 'es', 'vi', 'ar', 'it', 'ru'];
        const localizedMessages = await page.evaluate((languages) => languages.map((language) => {
            window.tentenGlobal.interfaceLanguage = language;
            return {
                language,
                progress: window.tentenT('questionProgress', { current: 10, total: 10 }),
                startSubtitle: window.tentenT('dailyQuizSubtitle'),
                learningTitle: window.tentenT('dailyQuizLearningTitle'),
                remaining: window.tentenT('dailyQuizWordsRemaining', { count: 2 }),
                allWords: window.tentenT('dailyQuizAllWordsTitle'),
                perfectPrompt: window.tentenT('dailyQuizPerfectPrompt'),
                continueAction: window.tentenT('dailyQuizContinueLearning'),
                retryAction: window.tentenT('dailyQuizRetryAction'),
                retryGameAction: window.tentenT('dailyQuizRetrySame')
            };
        }), languageCodes);
        const invalidLocalizedMessage = localizedMessages.find((entry) => (
            !entry.progress.includes('10')
            || !entry.startSubtitle.includes('12')
            || !entry.remaining.includes('2')
            || !entry.allWords.includes('12')
            || !entry.perfectPrompt
            || Object.values(entry).some((value) => typeof value === 'string' && /\{(?:count|total|current)\}/.test(value))
        ));
        if (invalidLocalizedMessage) {
            throw new Error(`localized 12-word/10-question messages are incomplete: ${JSON.stringify(invalidLocalizedMessage)}`);
        }
        await page.evaluate(() => {
            window.tentenGlobal.interfaceLanguage = 'ko';
            document.documentElement.dir = 'ltr';
        });
        await page.setViewportSize({ width: 430, height: 920 });

        const algorithmBaseline = await page.evaluate(async () => {
            const dailyWords = await buildDailyQuizQuestions();
            const fallbackNewStageOne = { id: 'fallback-new-stage-1', stage: 1 };
            const fallbackNewAll = { id: 'fallback-new-all', stage: 2 };
            const fallbackGeneralStageOne = { id: 'fallback-general-stage-1', stage: 1 };
            const fallbackGeneralAll = { id: 'fallback-general-all', stage: 2 };
            const fallbackPriority = takeDailyQuizFallbackItems({
                newStageOnePool: [fallbackNewStageOne],
                newPool: [fallbackNewStageOne, fallbackNewAll],
                stageOnePool: [fallbackNewStageOne, fallbackGeneralStageOne],
                allPool: [fallbackNewStageOne, fallbackNewAll, fallbackGeneralStageOne, fallbackGeneralAll]
            }, 4, new Set()).map(getDailyQuizQuestionKey);
            const previousCategory = window.selectedQuizCategory;
            const previousSection = window.selectedQuizSection;
            const normalSection = getAvailableSectionsByStage(1)[0].key;
            window.selectedQuizCategory = '1';
            window.selectedQuizSection = normalSection;
            await prepareQuizSet();
            const normalTotal = TOTAL_QUESTIONS;
            updateResultActionButtons();
            const normalRetryText = document.getElementById('restart-stage-btn').textContent.trim();
            const normalRetryExpected = window.tentenT('retryStage');
            const normalRetryHidden = document.getElementById('result-retry-wrap').hidden;
            window.selectedQuizCategory = previousCategory;
            window.selectedQuizSection = previousSection;
            updateResultActionButtons();
            return {
                dailyWordCount: dailyWords.length,
                dailyUniqueCount: new Set(dailyWords.map(getDailyQuizQuestionKey)).size,
                fallbackStages: dailyWords.map((item) => Number(item.stage)),
                fallbackPriority,
                normalTotal,
                normalRetryText,
                normalRetryExpected,
                normalRetryHidden
            };
        });
        if (
            algorithmBaseline.dailyWordCount !== 12
            || algorithmBaseline.dailyUniqueCount !== 12
            || algorithmBaseline.fallbackStages.some((stage) => stage !== 1)
            || JSON.stringify(algorithmBaseline.fallbackPriority) !== JSON.stringify([
                'fallback-new-stage-1',
                'fallback-new-all',
                'fallback-general-stage-1',
                'fallback-general-all'
            ])
        ) {
            throw new Error(`daily fallback priority or 12-word uniqueness failed: ${JSON.stringify(algorithmBaseline)}`);
        }
        if (
            algorithmBaseline.normalTotal !== 10
            || algorithmBaseline.normalRetryText !== algorithmBaseline.normalRetryExpected
            || algorithmBaseline.normalRetryHidden
        ) {
            throw new Error(`normal stage quiz or retry action changed: ${JSON.stringify(algorithmBaseline)}`);
        }

        const migrationChecks = await page.evaluate(async () => {
            const storageKey = getDailyQuizStorageKey();
            const achievementKey = getDailyQuizAchievementStorageKey('ko', 'en');
            const questions = getUniqueSectionQuestions(1, getAvailableSectionsByStage(1)[0].key).slice(0, 10);
            const questionKeys = questions.map(getDailyQuizQuestionKey);
            const makeResults = (count, wrongIndex = -1) => questionKeys.slice(0, count).map((questionKey, index) => ({
                questionKey,
                status: index === wrongIndex ? 'wrong' : 'correct'
            }));
            const writeLegacy = ({ resultCount, completed, cleared, lastScore, wrongIndex = -1 }) => {
                localStorage.setItem(storageKey, JSON.stringify({
                    version: 1,
                    dateKey: getDailyQuizDateKey(),
                    questionKeys,
                    cleared,
                    attempts: completed ? 1 : 0,
                    lastScore,
                    createdAt: 123,
                    attempt: {
                        results: makeResults(resultCount, wrongIndex),
                        completed,
                        startedAt: 456,
                        ...(completed ? { completedAt: 789 } : {})
                    },
                    ...(cleared ? { clearedAt: 789 } : {})
                }));
                activeDailyQuizSession = null;
            };

            writeLegacy({ resultCount: 10, completed: true, cleared: true, lastScore: 10 });
            const eventCountBefore = window.__dailyAchievementEvents;
            const writesBefore = window.__dailyCloudWrites.length;
            const completed = await migrateDailyQuizSessionIfNeeded();
            updateDailyQuizBanner();
            const completedMigration = {
                version: completed.version,
                dailyWordCount: completed.dailyWordCount,
                gameQuestionCount: completed.currentGame.questionKeys.length,
                legacyCompleted: completed.legacyCompleted,
                cleared: completed.cleared,
                eventDelta: window.__dailyAchievementEvents - eventCountBefore,
                writeDelta: window.__dailyCloudWrites.length - writesBefore,
                status: document.getElementById('daily-quiz-status').textContent.trim()
            };
            localStorage.removeItem(achievementKey);

            const inProgressMigrations = [];
            for (const resultCount of [1, 9]) {
                writeLegacy({ resultCount, completed: false, cleared: false, lastScore: null });
                const migrated = await migrateDailyQuizSessionIfNeeded();
                inProgressMigrations.push({
                    resultCount,
                    version: migrated.version,
                    dailyWordCount: migrated.dailyWordKeys.length,
                    dailyUniqueCount: new Set(migrated.dailyWordKeys).size,
                    gameCount: migrated.currentGame.questionKeys.length,
                    originalGamePreserved: JSON.stringify(migrated.currentGame.questionKeys) === JSON.stringify(questionKeys),
                    resultKeys: migrated.currentGame.results.map((result) => result.questionKey),
                    expectedResultKeys: questionKeys.slice(0, resultCount),
                    exposedCount: Object.values(migrated.wordStats).filter((stats) => stats.exposureCount > 0).length
                });
            }

            writeLegacy({ resultCount: 0, completed: false, cleared: false, lastScore: null });
            const unstarted = await migrateDailyQuizSessionIfNeeded();
            const unstartedMigration = {
                dailyWordCount: unstarted.dailyWordKeys.length,
                gameCount: unstarted.currentGame.questionKeys.length,
                originalGamePreserved: JSON.stringify(unstarted.currentGame.questionKeys) === JSON.stringify(questionKeys),
                createdAt: unstarted.createdAt
            };

            writeLegacy({ resultCount: 10, completed: true, cleared: false, lastScore: 9, wrongIndex: 9 });
            const failed = await migrateDailyQuizSessionIfNeeded();
            const additions = failed.dailyWordKeys.filter((key) => !questionKeys.includes(key));
            resetDailyQuizAttempt();
            const failedRetry = activeDailyQuizSession.currentGame.questionKeys.slice();

            localStorage.removeItem(storageKey);
            localStorage.removeItem(achievementKey);
            activeDailyQuizSession = null;
            window.selectedQuizCategory = '';
            window.selectedQuizSection = getDefaultSectionKey();
            stopDailyQuizBannerCelebration();
            updateDailyQuizBanner();
            return {
                completedMigration,
                inProgressMigrations,
                unstartedMigration,
                failedMigration: {
                    dailyWordCount: failed.dailyWordKeys.length,
                    gameCount: failed.currentGame.questionKeys.length,
                    lastAttemptQuestionCount: failed.lastAttemptQuestionCount,
                    additionsIncluded: additions.every((key) => failedRetry.includes(key)),
                    wrongPrioritized: failedRetry.includes(questionKeys[9])
                }
            };
        });
        if (
            migrationChecks.completedMigration.version !== 2
            || migrationChecks.completedMigration.dailyWordCount !== 10
            || migrationChecks.completedMigration.gameQuestionCount !== 10
            || !migrationChecks.completedMigration.legacyCompleted
            || !migrationChecks.completedMigration.cleared
            || migrationChecks.completedMigration.eventDelta !== 0
            || migrationChecks.completedMigration.writeDelta !== 0
            || migrationChecks.completedMigration.status !== '✓ 1일 달성'
        ) {
            throw new Error(`legacy 10/10 completion migration failed: ${JSON.stringify(migrationChecks.completedMigration)}`);
        }
        const invalidInProgressMigration = migrationChecks.inProgressMigrations.find((migration) => (
            migration.version !== 2
            || migration.dailyWordCount !== 12
            || migration.dailyUniqueCount !== 12
            || migration.gameCount !== 10
            || !migration.originalGamePreserved
            || JSON.stringify(migration.resultKeys) !== JSON.stringify(migration.expectedResultKeys)
            || migration.exposedCount !== migration.resultCount
        ));
        if (invalidInProgressMigration) {
            throw new Error(`in-progress production session migration failed: ${JSON.stringify(invalidInProgressMigration)}`);
        }
        if (
            migrationChecks.unstartedMigration.dailyWordCount !== 12
            || migrationChecks.unstartedMigration.gameCount !== 10
            || !migrationChecks.unstartedMigration.originalGamePreserved
            || migrationChecks.unstartedMigration.createdAt !== 123
        ) {
            throw new Error(`unstarted production session compatibility failed: ${JSON.stringify(migrationChecks.unstartedMigration)}`);
        }
        if (
            migrationChecks.failedMigration.dailyWordCount !== 12
            || migrationChecks.failedMigration.gameCount !== 10
            || migrationChecks.failedMigration.lastAttemptQuestionCount !== 10
            || !migrationChecks.failedMigration.additionsIncluded
            || !migrationChecks.failedMigration.wrongPrioritized
        ) {
            throw new Error(`failed production session retry migration failed: ${JSON.stringify(migrationChecks.failedMigration)}`);
        }

        const fixture = await page.evaluate(async () => {
            const questions = getUniqueSectionQuestions(1, getAvailableSectionsByStage(1)[0].key).slice(0, 12);
            for (const item of questions.slice(0, 4)) await addOrUpdateWrong(item);
            for (const item of questions.slice(4, 6)) await addToWordbook(item);
            for (const [index, item] of questions.slice(6, 10).entries()) {
                await dbPutItem(STORE_PROGRESS, {
                    id: getQuestionProgressId(item),
                    stage: Number(item.stage),
                    section: String(item.category || item.section || ''),
                    learnedAt: 1000 + index
                });
            }
            return {
                wrong: questions.slice(0, 4).map(getDailyQuizQuestionKey),
                wordbook: questions.slice(4, 6).map(getDailyQuizQuestionKey),
                due: questions.slice(6, 8).map(getDailyQuizQuestionKey),
                confidence: questions.slice(8, 10).reverse().map(getDailyQuizQuestionKey),
                recorded: questions.slice(0, 10).map(getDailyQuizQuestionKey)
            };
        });

        if (process.env.TENTEN_DAILY_BANNER_CAPTURE) {
            await page.locator('#section-select-screen').screenshot({ path: process.env.TENTEN_DAILY_BANNER_CAPTURE });
        }

        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => document.getElementById('quiz-card').style.display === 'block');
        let edgeSession = (await getDailyStorage(page)).session;
        if (
            edgeSession.version !== 2
            || edgeSession.dailyWordKeys.length !== 12
            || new Set(edgeSession.dailyWordKeys).size !== 12
            || edgeSession.currentGame.questionKeys.length !== 10
            || new Set(edgeSession.currentGame.questionKeys).size !== 10
        ) {
            throw new Error(`daily session must contain 12 unique words and a 10-question game: ${JSON.stringify(edgeSession)}`);
        }
        const sourceAt = (key) => {
            if (fixture.wrong.includes(key)) return 'wrong';
            if (fixture.wordbook.includes(key)) return 'wordbook';
            if (fixture.due.includes(key)) return 'due';
            if (fixture.confidence.includes(key)) return 'confidence';
            return 'new';
        };
        const dailyWordSet = new Set(edgeSession.dailyWordKeys);
        for (const [label, keys] of Object.entries({
            wrong: fixture.wrong,
            wordbook: fixture.wordbook,
            due: fixture.due,
            confidence: fixture.confidence
        })) {
            const count = keys.filter((key) => dailyWordSet.has(key)).length;
            if (count !== keys.length) throw new Error(`daily pool omitted planned ${label} words: ${count}/${keys.length}`);
        }
        const expectedTemplate = ['confidence', 'wrong', 'new', 'wordbook', 'due', 'wrong', 'confidence', 'new', 'wrong', 'wordbook', 'due', 'wrong'];
        const actualTemplate = edgeSession.dailyWordKeys.map(sourceAt);
        if (JSON.stringify(actualTemplate) !== JSON.stringify(expectedTemplate)) {
            throw new Error(`daily word source interleave is incorrect: ${JSON.stringify(actualTemplate)}`);
        }
        const newKeys = edgeSession.dailyWordKeys.filter((key) => sourceAt(key) === 'new');
        const newQuestionStages = await page.evaluate((keys) => keys.map((key) => Number(findDailyQuizQuestion(key)?.stage)), newKeys);
        if (
            newKeys.length !== 2
            || newKeys.some((key) => fixture.recorded.includes(key))
            || newQuestionStages.some((stage) => stage !== 1)
        ) {
            throw new Error(`daily new-word rule failed: ${JSON.stringify({ newKeys, newQuestionStages })}`);
        }

        const firstGameKeys = edgeSession.currentGame.questionKeys.slice();
        const omittedFromFirstGame = edgeSession.dailyWordKeys.filter((key) => !firstGameKeys.includes(key));
        await answerCurrentQuestion(page, true);
        await answerCurrentQuestion(page, true);
        const beforeClose = (await getDailyStorage(page)).session;
        await page.close();
        page = await context.newPage();
        page.on('request', (request) => {
            if (/firestore|firebaseio|firebaseapp|googleapis\.com\/.*firestore/i.test(request.url())) {
                firebaseRequests.push(request.url());
            }
        });
        await page.goto(`http://127.0.0.1:${port}/?native=ko&learn=en`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');
        if (!(await page.locator('#daily-quiz-status').innerText()).includes('3/10')) {
            throw new Error('browser re-entry did not restore the third question of a 10-question game');
        }
        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => document.getElementById('progress-text').textContent.includes('3 / 10'));
        const afterClose = (await getDailyStorage(page)).session;
        if (
            JSON.stringify(beforeClose.dailyWordKeys) !== JSON.stringify(afterClose.dailyWordKeys)
            || JSON.stringify(beforeClose.currentGame.questionKeys) !== JSON.stringify(afterClose.currentGame.questionKeys)
            || afterClose.currentGame.results.length !== 2
        ) {
            throw new Error('browser re-entry changed the daily pool, game order, or progress');
        }
        await answerDailyGame(page);
        await page.waitForFunction(() => document.getElementById('result-card').style.display === 'block');
        edgeSession = (await getDailyStorage(page)).session;
        let achievementEventCount = await page.evaluate(() => window.__dailyAchievementEvents);
        if (
            edgeSession.lastScore !== 10
            || edgeSession.currentGame.allWordsExposedAtStart
            || edgeSession.games[0]?.allWordsExposedAtStart
            || edgeSession.perfectGame
            || edgeSession.all12Exposed
            || edgeSession.cleared
            || achievementEventCount !== 0
        ) {
            throw new Error(`first-game 10/10 was incorrectly treated as final completion: ${JSON.stringify(edgeSession)}`);
        }
        if (
            await page.locator('#daily-quiz-result-guidance').count() !== 0
            || !(await page.locator('#result-retry-wrap').isHidden())
        ) {
            throw new Error('first-game result must omit daily progress guidance and the daily retry action');
        }

        await page.evaluate(() => { window.__dailyTestOnline = false; });
        await page.click('#result-back-all-btn');
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');
        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => document.getElementById('progress-text').textContent.includes('1 / 10'));
        const edgeSecondSession = (await getDailyStorage(page)).session;
        const edgeSecondGame = edgeSecondSession.currentGame.questionKeys;
        if (
            edgeSecondGame.length !== 10
            || new Set(edgeSecondGame).size !== 10
            || !omittedFromFirstGame.every((key) => edgeSecondGame.includes(key))
            || edgeSecondSession.currentGame.allWordsExposedAtStart
        ) {
            throw new Error(`second game did not force the two unseen words: ${JSON.stringify({ omittedFromFirstGame, edgeSecondGame })}`);
        }
        await answerDailyGame(page, [edgeSecondGame[0]]);
        await page.waitForFunction(() => document.getElementById('result-card').style.display === 'block');
        edgeSession = (await getDailyStorage(page)).session;
        achievementEventCount = await page.evaluate(() => window.__dailyAchievementEvents);
        if (edgeSession.lastScore !== 9 || !edgeSession.all12Exposed || edgeSession.perfectGame || edgeSession.cleared || achievementEventCount !== 0) {
            throw new Error(`pre-exposure 10/10 was reused after all 12 words were exposed: ${JSON.stringify(edgeSession)}`);
        }

        await page.click('#result-back-all-btn');
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');
        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => document.getElementById('progress-text').textContent.includes('1 / 10'));
        edgeSession = (await getDailyStorage(page)).session;
        if (!edgeSession.currentGame.allWordsExposedAtStart) {
            throw new Error(`game 3 was not marked eligible after all 12 words were exposed: ${JSON.stringify(edgeSession.currentGame)}`);
        }
        await answerDailyGame(page);
        await page.waitForFunction(() => document.getElementById('result-card').style.display === 'block');
        edgeSession = (await getDailyStorage(page)).session;
        achievementEventCount = await page.evaluate(() => window.__dailyAchievementEvents);
        if (
            edgeSession.lastScore !== 10
            || !edgeSession.all12Exposed
            || !edgeSession.perfectGame
            || !edgeSession.cleared
            || edgeSession.games.length !== 3
            || !edgeSession.games[2]?.allWordsExposedAtStart
            || achievementEventCount !== 1
        ) {
            throw new Error(`post-exposure 10/10 did not complete the daily quiz: ${JSON.stringify(edgeSession)}`);
        }

        await page.evaluate(async (wrongKeys) => {
            localStorage.removeItem(getDailyQuizStorageKey());
            localStorage.removeItem(getDailyQuizAchievementStorageKey('ko', 'en'));
            localStorage.removeItem('tenten.cloudBackupProfile.v1');
            window.__dailyAchievementEvents = 0;
            window.__dailyAchievementDetails = [];
            window.__dailyCloudWrites = [];
            window.__dailyTestOnline = true;
            activeDailyQuizSession = null;
            for (const item of await dbGetAll(STORE_WRONG)) {
                await dbDeleteItem(STORE_WRONG, item.id);
            }
            for (const key of wrongKeys) {
                const question = findDailyQuizQuestion(key);
                if (question) await addOrUpdateWrong(question);
            }
        }, fixture.wrong);
        await page.goto(`http://127.0.0.1:${port}/?native=ko&learn=en`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');

        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => document.getElementById('progress-text').textContent.includes('1 / 10'));
        let session = (await getDailyStorage(page)).session;
        const mainFirstGame = session.currentGame.questionKeys.slice();
        const mainOmitted = session.dailyWordKeys.filter((key) => !mainFirstGame.includes(key));
        const firstWrongKey = mainFirstGame[0];
        await answerDailyGame(page, [firstWrongKey]);
        await page.waitForFunction(() => document.getElementById('result-card').style.display === 'block');
        session = (await getDailyStorage(page)).session;
        achievementEventCount = await page.evaluate(() => window.__dailyAchievementEvents);
        if (
            session.lastScore !== 9
            || session.all12Exposed
            || session.perfectGame
            || session.cleared
            || achievementEventCount !== 0
        ) {
            throw new Error(`12 words unexposed + 9/10 must remain incomplete: ${JSON.stringify(session)}`);
        }
        if (
            await page.locator('#daily-quiz-result-guidance').count() !== 0
            || !(await page.locator('#result-retry-wrap').isHidden())
            || !(await page.locator('#wrong-answers-container').isVisible())
            || !(await page.locator('#correct-answers-container').isVisible())
            || !(await page.locator('#share-result-btn').isVisible())
            || !(await page.locator('#share-notes-btn').isVisible())
            || !(await page.locator('#result-back-all-btn').isVisible())
            || await page.getByRole('button', { name: /단어장에 추가|단어장에서 빼기/ }).count() !== 10
        ) {
            throw new Error('9/10 result must focus on the finished game without the daily retry action');
        }

        await page.click('#result-back-all-btn');
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');
        if (
            (await page.locator('#daily-quiz-subtitle').innerText()).trim() !== '오늘의 단어 2개가 남았어요'
            || !(await page.locator('#daily-quiz-detail').isHidden())
            || (await page.locator('#daily-quiz-status').innerText()).trim() !== '계속 학습'
            || !(await page.locator('#daily-quiz-banner').evaluate((element) => element.classList.contains('is-learning')))
        ) {
            throw new Error('returning from the first result did not immediately show the remaining-word card state');
        }
        await captureDailyCardScreens(page, '02-remaining');
        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => document.getElementById('progress-text').textContent.includes('1 / 10'));
        session = (await getDailyStorage(page)).session;
        const secondGameKeys = session.currentGame.questionKeys.slice();
        if (
            secondGameKeys.length !== 10
            || new Set(secondGameKeys).size !== 10
            || !mainOmitted.every((key) => secondGameKeys.includes(key))
            || !secondGameKeys.includes(firstWrongKey)
        ) {
            throw new Error(`unseen/wrong priority failed in game 2: ${JSON.stringify({ mainOmitted, firstWrongKey, secondGameKeys })}`);
        }
        const secondWrongKey = secondGameKeys.find((key) => key !== firstWrongKey && !mainOmitted.includes(key)) || secondGameKeys[9];
        await answerDailyGame(page, [secondWrongKey]);
        await page.waitForFunction(() => document.getElementById('result-card').style.display === 'block');
        session = (await getDailyStorage(page)).session;
        achievementEventCount = await page.evaluate(() => window.__dailyAchievementEvents);
        if (
            session.lastScore !== 9
            || !session.all12Exposed
            || session.perfectGame
            || session.cleared
            || achievementEventCount !== 0
        ) {
            throw new Error(`all 12 exposed + 9/10 must remain incomplete: ${JSON.stringify(session)}`);
        }
        if (
            await page.locator('#daily-quiz-result-guidance').count() !== 0
            || !(await page.locator('#result-retry-wrap').isHidden())
        ) {
            throw new Error('all-words/no-perfect result must omit daily progress guidance and the daily retry action');
        }

        for (const viewport of [{ width: 320, height: 700 }, { width: 1280, height: 900 }]) {
            await page.setViewportSize(viewport);
            const resultLayouts = await page.evaluate((languages) => {
                const retryWrap = document.getElementById('result-retry-wrap');
                const backAll = document.getElementById('result-back-all-btn');
                return languages.map((language) => {
                    window.tentenGlobal.interfaceLanguage = language;
                    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
                    updateResultActionButtons();
                    const backRect = backAll.getBoundingClientRect();
                    return {
                        language,
                        retryHidden: retryWrap.hidden,
                        backText: backAll.textContent.trim(),
                        backExpected: window.tentenT('backToStages'),
                        backOverflow: backAll.scrollWidth - backAll.clientWidth,
                        backViewportOverflow: Math.max(0, backRect.right - innerWidth, -backRect.left)
                    };
                });
            }, languageCodes);
            const layoutFailure = resultLayouts.find((layout) => (
                !layout.retryHidden
                || !layout.backText
                || layout.backText !== layout.backExpected
                || layout.backOverflow > 1
                || layout.backViewportOverflow > 1
            ));
            if (layoutFailure) {
                throw new Error(`localized daily result actions failed at ${viewport.width}px: ${JSON.stringify(layoutFailure)}`);
            }
        }
        await page.evaluate(() => {
            window.tentenGlobal.interfaceLanguage = 'ko';
            document.documentElement.dir = 'ltr';
            updateResultActionButtons();
        });
        await page.setViewportSize({ width: 430, height: 920 });

        await page.click('#result-back-all-btn');
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');
        if (
            (await page.locator('#daily-quiz-subtitle').innerText()).trim() !== '10문제를 맞히면 오늘의 퀴즈 완료!'
            || !(await page.locator('#daily-quiz-detail').evaluate((element) => element.hidden && !element.textContent.trim()))
            || (await page.locator('#daily-quiz-status').innerText()).trim() !== '다시 도전'
            || !(await page.locator('#daily-quiz-banner').evaluate((element) => element.classList.contains('is-perfect-target')))
        ) {
            throw new Error('returning after all-word exposure did not immediately show the perfect-game card prompt');
        }
        await captureDailyCardScreens(page, '03-perfect-target');
        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => document.getElementById('progress-text').textContent.includes('1 / 10'));
        session = (await getDailyStorage(page)).session;
        if (
            session.currentGame.questionKeys.length !== 10
            || new Set(session.currentGame.questionKeys).size !== 10
            || !session.currentGame.allWordsExposedAtStart
        ) {
            throw new Error('game 3 is not a unique 10-question game');
        }
        await answerDailyGame(page);
        await page.waitForFunction(() => document.getElementById('result-card').style.display === 'block');
        session = (await getDailyStorage(page)).session;
        achievementEventCount = await page.evaluate(() => window.__dailyAchievementEvents);
        if (
            session.lastScore !== 10
            || !session.all12Exposed
            || !session.perfectGame
            || !session.cleared
            || session.games.length !== 3
            || !session.games[2]?.allWordsExposedAtStart
            || achievementEventCount !== 1
        ) {
            throw new Error(`all 12 exposed + 10/10 did not complete exactly once: ${JSON.stringify(session)}`);
        }
        await page.waitForFunction(() => (
            window.TentenCloudBackup.readProfile()?.pendingMilestones?.some((id) => id.startsWith('daily:ko:en:'))
        ));
        const immediateDailyBackup = await page.evaluate(() => ({
            writes: window.__dailyCloudWrites.length,
            pending: window.TentenCloudBackup.readProfile()?.pendingMilestones?.slice() || []
        }));
        if (immediateDailyBackup.writes !== 0 || immediateDailyBackup.pending.length !== 1) {
            throw new Error(`daily completion did not persist its marker before the delayed upload: ${JSON.stringify(immediateDailyBackup)}`);
        }
        await page.waitForTimeout(350);
        if (await page.evaluate(() => window.__dailyCloudWrites.length) !== 0) {
            throw new Error('daily completion uploaded before the configured grace period');
        }
        if (!(await page.locator('#result-retry-wrap').isHidden()) || await page.locator('#daily-quiz-result-guidance').count() !== 0) {
            throw new Error('final completion must hide the daily retry action and keep progress guidance out of the result');
        }

        const achievementState = await page.evaluate(async () => {
            const achievement = readDailyQuizAchievement('ko', 'en');
            const payload = await window.TentenLearningRecords.createBackupPayload();
            return {
                achievement,
                backupAchievements: payload.dailyQuizAchievements,
                eventCount: window.__dailyAchievementEvents,
                eventDetails: window.__dailyAchievementDetails
            };
        });
        const completionDetail = achievementState.eventDetails[0];
        if (
            achievementState.achievement.currentStreak !== 1
            || achievementState.achievement.bestStreak !== 1
            || achievementState.achievement.totalClearDays !== 1
            || achievementState.backupAchievements.length !== 1
            || achievementState.eventCount !== 1
            || completionDetail?.dailyWordCount !== 12
            || completionDetail?.allWordsExposed !== true
            || completionDetail?.allWordsExposedAtGameStart !== true
            || completionDetail?.perfectGame !== true
            || completionDetail?.questionCount !== 10
            || completionDetail?.score !== 10
        ) {
            throw new Error(`new completion event payload is incorrect: ${JSON.stringify(achievementState)}`);
        }

        await page.waitForFunction(() => window.__dailyCloudWrites.length === 1, null, { timeout: 8000 });
        const delayedDailyUpload = await page.evaluate(async () => {
            const profile = window.TentenCloudBackup.readProfile();
            const stored = window.__dailyCloudWrites[0];
            const decrypted = await window.TentenCloudBackup.decryptPayload(stored.body, profile.recoveryCode);
            const payloadText = JSON.stringify(decrypted.payload);
            return {
                pending: profile.pendingMilestones.slice(),
                achievementCount: decrypted.payload.dailyQuizAchievements?.length || 0,
                hasDailySession: ['dailyWordKeys', 'wordStats', 'currentGame', 'games'].some((field) => payloadText.includes(`\"${field}\"`))
            };
        });
        if (
            delayedDailyUpload.pending.length !== 0
            || delayedDailyUpload.achievementCount !== 1
            || delayedDailyUpload.hasDailySession
        ) {
            throw new Error(`delayed daily upload payload is incorrect: ${JSON.stringify(delayedDailyUpload)}`);
        }
        const rejectedCloudCompletions = await page.evaluate(async () => {
            const writesBefore = window.__dailyCloudWrites.length;
            const pendingBefore = window.TentenCloudBackup.readProfile()?.pendingMilestones?.length || 0;
            const base = { nativeLanguage: 'ko', learningLanguage: 'en' };
            await window.TentenCloudBackup.queueDailyQuizBackup({
                ...base, dateKey: '2099-01-01', dailyWordCount: 12,
                allWordsExposed: true, perfectGame: true, questionCount: 12, score: 12
            });
            await window.TentenCloudBackup.queueDailyQuizBackup({
                ...base, dateKey: '2099-01-02', questionCount: 10, score: 10
            });
            await window.TentenCloudBackup.queueDailyQuizBackup({
                ...base, dateKey: '2099-01-03', dailyWordCount: 12,
                allWordsExposed: false, perfectGame: true, questionCount: 10, score: 10
            });
            await window.TentenCloudBackup.queueDailyQuizBackup({
                ...base, dateKey: '2099-01-04', dailyWordCount: 12,
                allWordsExposed: true, allWordsExposedAtGameStart: false,
                perfectGame: true, questionCount: 10, score: 10
            });
            return {
                writeDelta: window.__dailyCloudWrites.length - writesBefore,
                pendingDelta: (window.TentenCloudBackup.readProfile()?.pendingMilestones?.length || 0) - pendingBefore
            };
        });
        if (rejectedCloudCompletions.writeDelta !== 0 || rejectedCloudCompletions.pendingDelta !== 0) {
            throw new Error(`cloud backup accepted an invalid daily completion: ${JSON.stringify(rejectedCloudCompletions)}`);
        }
        await page.evaluate(() => {
            completeDailyQuizAttempt(10);
            recordDailyQuizAchievement(new Date(), {
                dailyWordCount: 12,
                allWordsExposed: true,
                allWordsExposedAtGameStart: true,
                perfectGame: true,
                questionCount: 10
            });
        });
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
            const detail = window.__dailyAchievementDetails[0];
            window.dispatchEvent(new CustomEvent('tenten-daily-quiz-completed', { detail }));
            window.dispatchEvent(new CustomEvent('tenten-daily-quiz-completed', { detail }));
        });
        await page.waitForTimeout(250);
        const duplicateEventState = await page.evaluate(() => ({
            writes: window.__dailyCloudWrites.length,
            pending: window.TentenCloudBackup.readProfile()?.pendingMilestones?.slice() || []
        }));
        if (duplicateEventState.writes !== 1 || duplicateEventState.pending.length !== 0) {
            throw new Error(`duplicate daily completion events were not idempotent: ${JSON.stringify(duplicateEventState)}`);
        }

        await page.evaluate(() => {
            const dialog = document.getElementById('cloud-backup-recovery-dialog');
            if (dialog?.open) dialog.close();
        });
        await page.click('#result-back-all-btn');
        await page.waitForSelector('#daily-quiz-banner:not([hidden])');
        if ((await page.locator('#daily-quiz-status').innerText()).trim() !== '✓ 1일 달성') {
            throw new Error('main banner did not switch to the final achievement state');
        }
        await page.waitForFunction(() => document.getElementById('daily-quiz-status')?.classList.contains('is-celebrating'));
        const completionMotion = await page.locator('#daily-quiz-status').evaluate((status) => {
            const style = getComputedStyle(status);
            const card = document.getElementById('daily-quiz-banner');
            return {
                animationName: style.animationName,
                animationDuration: style.animationDuration,
                animationTimingFunction: style.animationTimingFunction,
                animationIterationCount: style.animationIterationCount,
                cardTransform: getComputedStyle(card).transform,
                statusTransform: style.transform
            };
        });
        if (
            completionMotion.animationName !== 'completedProgressEmojiBounce'
            || completionMotion.animationDuration !== '0.72s'
            || completionMotion.animationTimingFunction !== 'cubic-bezier(0.22, 0.82, 0.3, 1)'
            || completionMotion.animationIterationCount !== '1'
            || completionMotion.cardTransform !== 'none'
        ) {
            throw new Error(`daily completion did not reuse the section success motion: ${JSON.stringify(completionMotion)}`);
        }
        await page.waitForTimeout(180);
        await captureDailyCardScreens(page, '04-completed');
        const firstMotionStart = await page.locator('#daily-quiz-status').evaluate((status) => status.getAnimations()[0]?.startTime || 0);
        await page.waitForFunction((previousStart) => {
            const animation = document.getElementById('daily-quiz-status')?.getAnimations()[0];
            return Number(animation?.startTime || 0) > previousStart;
        }, firstMotionStart, { timeout: 4500 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.evaluate(() => {
            stopDailyQuizBannerCelebration();
            updateDailyQuizBanner();
        });
        const reducedMotion = await page.locator('#daily-quiz-status').evaluate((status) => ({
            celebrating: status.classList.contains('is-celebrating'),
            animationName: getComputedStyle(status).animationName
        }));
        if (reducedMotion.celebrating || reducedMotion.animationName !== 'none') {
            throw new Error(`daily completion ignored reduced-motion: ${JSON.stringify(reducedMotion)}`);
        }
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.evaluate(() => updateDailyQuizBanner());

        const localStoreCounts = await page.evaluate(async () => ({
            wordbook: (await dbGetAll(STORE_WORDBOOK)).length,
            progress: (await dbGetAll(STORE_PROGRESS)).length,
            sectionEvents: window.__dailySectionCompletionEvents
        }));
        if (localStoreCounts.wordbook !== 2 || localStoreCounts.progress !== 4 || localStoreCounts.sectionEvents !== 0) {
            throw new Error(`daily games changed unrelated learning records: ${JSON.stringify(localStoreCounts)}`);
        }
        if (firebaseRequests.length !== 0) {
            throw new Error(`daily browser test bypassed the cloud test adapter: ${JSON.stringify(firebaseRequests)}`);
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
            window.tentenGlobal.learningLanguage = 'it';
            recordDailyQuizAchievement(new Date(), {
                dailyWordCount: 12,
                allWordsExposed: true,
                allWordsExposedAtGameStart: true,
                perfectGame: true,
                questionCount: 10
            });
        });
        await page.waitForFunction(() => (
            window.TentenCloudBackup.readProfile()?.pendingMilestones?.some((id) => id.startsWith('daily:ko:it:'))
        ));
        const writesBeforeDailyLimit = await page.evaluate(() => window.__dailyCloudWrites.length);
        await page.waitForTimeout(3300);
        const dailyLimitState = await page.evaluate(() => ({
            writes: window.__dailyCloudWrites.length,
            pending: window.TentenCloudBackup.readProfile()?.pendingMilestones?.slice() || []
        }));
        if (
            dailyLimitState.writes !== writesBeforeDailyLimit
            || !dailyLimitState.pending.some((id) => id.startsWith('daily:ko:it:'))
        ) {
            throw new Error(`the once-per-day limit did not retain the deferred daily marker: ${JSON.stringify(dailyLimitState)}`);
        }

        await page.evaluate(() => {
            window.__dailyTestOnline = false;
            const profile = window.TentenCloudBackup.readProfile();
            localStorage.setItem('tenten.cloudBackupProfile.v1', JSON.stringify({ ...profile, lastSyncedAt: '2000-01-01T00:00:00.000Z' }));
            window.tentenGlobal.learningLanguage = 'ja';
            recordDailyQuizAchievement(new Date(), {
                dailyWordCount: 12,
                allWordsExposed: true,
                allWordsExposedAtGameStart: true,
                perfectGame: true,
                questionCount: 10
            });
        });
        await page.waitForFunction(() => {
            const profile = window.TentenCloudBackup.readProfile();
            return profile?.pendingMilestones?.some((id) => id.startsWith('daily:ko:ja:'));
        });
        const offlinePendingState = await page.evaluate(() => ({
            writes: window.__dailyCloudWrites.length,
            pending: window.TentenCloudBackup.readProfile()?.pendingMilestones?.slice() || []
        }));
        if (offlinePendingState.writes !== 1 || offlinePendingState.pending.length !== 2) {
            throw new Error(`offline daily achievement did not preserve all pending markers: ${JSON.stringify(offlinePendingState)}`);
        }
        await page.evaluate(() => {
            window.__dailyTestOnline = true;
            window.dispatchEvent(new Event('online'));
        });
        await page.waitForFunction(() => (
            window.__dailyCloudWrites.length === 2
            && window.TentenCloudBackup.readProfile()?.pendingMilestones?.length === 0
        ), null, { timeout: 8000 });

        for (const failureCase of [
            { language: 'fr', code: 'permission-denied' },
            { language: 'de', code: 'unavailable' }
        ]) {
            const writesBeforeFailure = await page.evaluate(() => window.__dailyCloudWrites.length);
            await page.evaluate(({ language, code }) => {
                const profile = window.TentenCloudBackup.readProfile();
                localStorage.setItem('tenten.cloudBackupProfile.v1', JSON.stringify({
                    ...profile,
                    lastSyncedAt: '2000-01-01T00:00:00.000Z'
                }));
                window.tentenGlobal.learningLanguage = language;
                window.__dailyCloudFailureCode = code;
                recordDailyQuizAchievement(new Date(), {
                    dailyWordCount: 12,
                    allWordsExposed: true,
                    allWordsExposedAtGameStart: true,
                    perfectGame: true,
                    questionCount: 10
                });
            }, failureCase);
            await page.waitForFunction((language) => (
                window.TentenCloudBackup.readProfile()?.pendingMilestones?.some((id) => id.startsWith(`daily:ko:${language}:`))
            ), failureCase.language);
            await page.evaluate(() => window.TentenCloudBackup.syncNow({ force: true }).catch(() => null));
            const failedSyncState = await page.evaluate(() => ({
                writes: window.__dailyCloudWrites.length,
                pending: window.TentenCloudBackup.readProfile()?.pendingMilestones?.slice() || []
            }));
            if (failedSyncState.writes !== writesBeforeFailure || failedSyncState.pending.length === 0) {
                throw new Error(`failed ${failureCase.code} sync removed its pending marker: ${JSON.stringify(failedSyncState)}`);
            }
            await page.evaluate(() => {
                window.__dailyCloudFailureCode = '';
                window.dispatchEvent(new Event('online'));
            });
            await page.waitForFunction((expectedWrites) => (
                window.__dailyCloudWrites.length === expectedWrites
                && window.TentenCloudBackup.readProfile()?.pendingMilestones?.length === 0
            ), writesBeforeFailure + 1, { timeout: 8000 });
        }
        await page.evaluate(() => {
            window.__dailyCloudFailureCode = '';
            window.tentenGlobal.learningLanguage = 'en';
        });

        await page.evaluate(() => {
            const key = getDailyQuizStorageKey();
            const previous = JSON.parse(localStorage.getItem(key));
            previous.dateKey = '2000-01-01';
            localStorage.setItem(key, JSON.stringify(previous));
            activeDailyQuizSession = null;
            updateDailyQuizBanner();
        });
        await page.click('#daily-quiz-banner');
        await page.waitForFunction(() => {
            const session = JSON.parse(localStorage.getItem(getDailyQuizStorageKey()));
            return session?.dateKey && session.dateKey !== '2000-01-01';
        });
        const renewedSession = (await getDailyStorage(page)).session;
        if (
            renewedSession.dateKey === '2000-01-01'
            || renewedSession.cleared
            || renewedSession.attempts !== 0
            || renewedSession.dailyWordKeys.length !== 12
            || new Set(renewedSession.dailyWordKeys).size !== 12
            || renewedSession.currentGame.questionKeys.length !== 10
            || new Set(renewedSession.currentGame.questionKeys).size !== 10
        ) {
            throw new Error(`date rollover did not create a fresh 12-word/10-question session: ${JSON.stringify(renewedSession)}`);
        }

        console.log('OK: all 12 interface languages and Arabic RTL keep the card/result text within mobile and PC layouts');
        console.log('OK: daily pool uses 4/2/2/2/2, new-word/fallback rules, 12 unique words, and each game has 10 unique questions');
        console.log('OK: game 2 forces unseen words and prioritizes game-1 errors; game 3 remains a 10-question game');
        console.log('OK: a pre-exposure 10/10 is not reused after all 12 words become exposed');
        console.log('OK: final completion requires a new post-exposure 10/10 game and fires streak/cloud events once');
        console.log('OK: daily completion persists its marker immediately and uploads only after the grace period');
        console.log('OK: offline, App Check, and Firestore failures preserve pending markers for a safe retry');
        console.log('OK: refresh, browser re-entry, date rollover, and language-pair isolation preserve the intended state');
        console.log('OK: production v1 completed, in-progress, unstarted, and failed 10-question sessions remain compatible');
        console.log('OK: normal stage quizzes remain limited to 10 questions and daily play does not write learning progress');
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
