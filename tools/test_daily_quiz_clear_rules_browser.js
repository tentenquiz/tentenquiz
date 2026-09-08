// Local-only integration test: no requests may reach a production service.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
    res.setHeader('Content-Type', (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8');
    fs.createReadStream(file).pipe(res);
});

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        const executablePath = [chromium.executablePath(),
            'C:/Program Files/Google/Chrome/Application/chrome.exe',
            'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
        ].find(p => fs.existsSync(p));
        browser = await chromium.launch({ headless: true, executablePath });
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
            ? route.continue() : route.abort());
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${server.address().port}/?native=ko&learn=en`);
        await page.waitForFunction(() => typeof activeQuizData !== 'undefined' && activeQuizData.length > 0
            && !document.getElementById('daily-quiz-banner').hidden);

        async function seed() {
            await page.evaluate(async () => {
                localStorage.removeItem(getDailyQuizStorageKey());
                localStorage.removeItem(getDailyQuizAchievementStorageKey());
                activeDailyQuizSession = null;
                window.selectedQuizSection = 'daily_quiz';
                window.selectionStep = 'stage';
                await createDailyQuizSession();
                window.__clearEvents = [];
                if (!window.__clearListener) {
                    window.__clearListener = true;
                    window.addEventListener('tenten-daily-quiz-completed', e => window.__clearEvents.push(e.detail));
                }
                updateDailyQuizBanner();
            });
        }
        async function play(score, fixedTen = false) {
            return page.evaluate(({ score, fixedTen }) => {
                const session = activeDailyQuizSession || readDailyQuizSession();
                if (session.currentGame.completed) createDailyQuizGame(session);
                if (fixedTen) session.currentGame.questionKeys = session.dailyWordKeys.slice(0, 10);
                saveDailyQuizSession(session);
                session.currentGame.questionKeys.forEach((key, i) => {
                    const question = findDailyQuizQuestion(key);
                    markDailyQuizQuestionShown(question);
                    currentIdx = i;
                    recordDailyQuizAttemptResult(question, i < score ? 'correct' : 'wrong');
                });
                completeDailyQuizAttempt(score);
                renderPerfectStreakLine(null);
                const restored = readDailyQuizSession();
                return { streak: getDailyPerfectStreak(restored), cleared: restored.cleared,
                    exposures: Object.values(restored.wordStats).map(s => s.exposureCount),
                    all12: restored.all12Exposed, events: window.__clearEvents,
                    detail: document.getElementById('daily-quiz-detail').textContent,
                    line: document.getElementById('perfect-streak-line').textContent };
            }, { score, fixedTen });
        }
        await seed();
        const first = await play(10), second = await play(10), third = await play(10);
        assert.deepEqual([first.streak, second.streak, third.streak], [1, 2, 3]);
        assert.deepEqual([first.cleared, second.cleared, third.cleared], [false, false, true]);
        assert.equal(first.detail, '연속 클리어 1 / 3');
        assert.equal(second.line, '연속 클리어 2 / 3');
        assert.equal(third.line, '✓ 오늘의 퀴즈 완료');
        assert.equal(third.events.length, 1);
        console.log('PASS A: 1/3, 2/3, 3/3 and completion UI');
        assert.equal(third.exposures.reduce((a, b) => a + b, 0), 30);
        assert.equal(Math.min(...third.exposures), 2);
        assert.equal(Math.max(...third.exposures), 3);
        console.log('PASS E: real word pool, 10 unique questions/game, balanced 2–3 exposures');

        await seed();
        const b = [await play(10), await play(9), await play(10)];
        assert.deepEqual(b.map(s => s.streak), [1, 0, 1]);
        assert.equal(b[1].detail, '연속 클리어 0 / 3');
        assert.ok(b.every(s => !s.cleared));
        assert.ok(b[2].all12);
        console.log('PASS B/D: failure resets; all words exposed does not complete');

        await seed();
        await play(10, true); await play(10, true);
        const c = await play(10, true);
        assert.ok(c.cleared && !c.all12 && c.streak === 3);
        assert.equal(c.events[0].allWordsExposed, false);
        assert.equal(c.events[0].consecutiveClears, 3);
        await page.reload();
        await page.waitForFunction(() => typeof readDailyQuizSession === 'function' && readDailyQuizSession()?.cleared);
        assert.equal(await page.evaluate(() => getDailyPerfectStreak(readDailyQuizSession())), 3);
        console.log('PASS C: two unseen words do not block completion or reload');

        // Verify actual backup event gate, without sending anything to a server.
        const backupSource = fs.readFileSync(path.join(root, 'cloud-backup.js'), 'utf8');
        const gate = backupSource.slice(backupSource.indexOf('    function dailyQuizAchievementIdFromDetail'),
            backupSource.indexOf('    async function queueBackupMarker'));
        const validateBackup = new Function('global', `${gate}; return dailyQuizAchievementIdFromDetail;`)(
            { TENTEN_DAILY_QUIZ_WORD_COUNT: 12, TENTEN_DAILY_QUIZ_GAME_QUESTION_COUNT: 10 });
        assert.ok(validateBackup(c.events[0]));
        assert.equal(validateBackup({ ...c.events[0], consecutiveClears: 2 }), '');
        console.log('PASS: backup accepts 3 clears with unseen words; rejects 2 clears');

        await seed();
        await play(10);
        const languages = await page.evaluate(() => window.TENTEN_LANGUAGES.map(l => l.code));
        assert.equal(languages.length, 12);
        for (const width of [320, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            for (const language of languages) {
                const state = await page.evaluate(language => {
                    window.tentenGlobal.interfaceLanguage = language;
                    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
                    // Reuse the same daily fixture in each language partition for UI checking.
                    saveDailyQuizSession(window.__uiDailyFixture || (window.__uiDailyFixture = activeDailyQuizSession));
                    updateDailyQuizBanner();
                    renderPerfectStreakLine(null);
                    const messages = window.TENTEN_I18N_MESSAGES[language];
                    const detail = document.getElementById('daily-quiz-detail');
                    const banner = document.getElementById('daily-quiz-banner');
                    return { actual: detail.textContent, expected: tentenT('dailyQuizClearProgress', { count: 1, total: 3 }),
                        rules: messages.dailyQuizRules, title: banner.title,
                        overflow: banner.scrollWidth - banner.clientWidth,
                        keys: Object.keys(messages).sort() };
                }, language);
                assert.equal(state.actual, state.expected, language);
                assert.equal(state.title, state.rules, language);
                assert.ok(state.rules.includes('12') && state.rules.includes('10') && state.rules.includes('3'), language);
                assert.ok(state.overflow <= 1, `${language} overflow ${state.overflow}px at ${width}px`);
            }
        }
        console.log('PASS: all 12 languages, translated progress/rules, mobile/desktop banner');
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
