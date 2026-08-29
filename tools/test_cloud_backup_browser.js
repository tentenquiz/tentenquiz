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
const backups = new Map();
let revisionCounter = 0;
let putCount = 0;

function readBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        request.on('data', (chunk) => chunks.push(chunk));
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        request.on('error', reject);
    });
}

function send(response, status, body = '', headers = {}) {
    response.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
    response.end(body);
}

const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const apiMatch = url.pathname.match(/^\/test-firestore\/([A-Za-z0-9_-]{43})$/);
    if (apiMatch) {
        const id = apiMatch[1];
        const current = backups.get(id);
        if (request.method === 'GET') {
            if (!current) return send(response, 404, JSON.stringify({ error: 'not_found' }));
            if (request.headers['x-test-write-token'] !== current.writeToken) return send(response, 403);
            return send(response, 200, JSON.stringify({ body: current.body, revision: current.revision }), {
                'Content-Type': 'application/json'
            });
        }
        if (request.method === 'PUT') {
            const requestData = JSON.parse(await readBody(request));
            if (current && requestData.writeToken !== current.writeToken) return send(response, 403);
            if (current && requestData.expectedRevision !== current.revision) return send(response, 409);
            if (!current && requestData.expectedRevision) return send(response, 409);
            const revision = `test-${++revisionCounter}`;
            backups.set(id, { body: requestData.body, writeToken: requestData.writeToken, revision });
            putCount += 1;
            return send(response, 200, JSON.stringify({ revision }), { 'Content-Type': 'application/json' });
        }
        if (request.method === 'DELETE') {
            if (!current) return send(response, 404);
            const requestData = JSON.parse(await readBody(request));
            if (requestData.writeToken !== current.writeToken) return send(response, 403);
            if (requestData.expectedRevision && requestData.expectedRevision !== current.revision) return send(response, 409);
            backups.delete(id);
            return send(response, 200, JSON.stringify({ deleted: true }), { 'Content-Type': 'application/json' });
        }
        return send(response, 405);
    }

    const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let filePath = path.resolve(projectRoot, relativePath);
    if (filePath.startsWith(projectRoot) && fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }
    if (!filePath.startsWith(projectRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return send(response, 404, 'Not found');
    }
    response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(response);
});

function listen() {
    return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
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

async function configurePage(page, endpoint) {
    await page.addInitScript((firestoreTestEndpoint) => {
        window.__TENTEN_CLOUD_BACKUP_CONFIG__ = {
            firebaseConfig: {},
            maxEncryptedBytes: 10 * 1024 * 1024
        };
        const call = async (backupId, method, payload, writeToken) => {
            const response = await fetch(`${firestoreTestEndpoint}/${backupId}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(writeToken ? { 'X-Test-Write-Token': writeToken } : {})
                },
                body: payload ? JSON.stringify(payload) : undefined
            });
            if (response.status === 404) {
                const error = new Error('not found');
                error.code = 'not-found';
                throw error;
            }
            if (response.status === 409 || response.status === 412) {
                const error = new Error('conflict');
                error.code = 'conflict';
                throw error;
            }
            if (!response.ok) throw new Error(`test Firestore adapter failed: ${response.status}`);
            return response.json();
        };
        window.__TENTEN_FIRESTORE_TEST_ADAPTER__ = {
            putBackup: (payload) => call(payload.backupId, 'PUT', payload),
            getBackup: (payload) => call(payload.backupId, 'GET', null, payload.writeToken),
            headBackup: async (payload) => {
                try {
                    const current = await call(payload.backupId, 'GET', null, payload.writeToken);
                    return { exists: true, owned: true, revision: current.revision };
                } catch (error) {
                    if (error && error.code === 'not-found') {
                        return { exists: false, owned: false, revision: '' };
                    }
                    throw error;
                }
            },
            deleteBackup: (payload) => call(payload.backupId, 'DELETE', payload)
        };
    }, endpoint);
}

async function addProgress(page, id) {
    await page.evaluate(async (recordId) => {
        await markQuestionLearned({
            id: recordId,
            stage: 1,
            category: 'nature_weather',
            section: 'nature_weather'
        });
    }, id);
}

async function verifyNoteTextRendering(page) {
    const result = await page.evaluate(async () => {
        window.__TENTEN_NOTE_XSS_TRIGGERED__ = false;
        const notes = [
            '한국어 메모',
            'English note',
            '日本語のメモ',
            '中文笔记',
            '<img src=x onerror="window.__TENTEN_NOTE_XSS_TRIGGERED__=true">',
            '<svg onload="window.__TENTEN_NOTE_XSS_TRIGGERED__=true"></svg>',
            '<script>window.__TENTEN_NOTE_XSS_TRIGGERED__=true</script>'
        ];
        const validated = window.TentenLearningRecords.validateBackupPayload({
            format: 'tentenquiz-learning-records',
            version: 1,
            exportedAt: new Date().toISOString(),
            preferences: { interfaceLanguage: 'ko', learningLanguage: 'vi', chineseReading: 'pinyin' },
            dailyQuizAchievements: [],
            databases: [{
                name: 'tenTenQuizGlobalDB_ko_to_vi',
                stores: {
                    wrongBank: notes.map((note, index) => ({ id: `note-${index}`, stage: 1, note })),
                    myWordbook: [],
                    learningProgress: []
                }
            }]
        });
        const restoredNotes = validated.databases[0].stores.wrongBank.map((record) => record.note);
        const rendered = restoredNotes.map((note) => {
            const container = document.createElement('div');
            container.innerHTML = `<div class="word-note-text">${pinyinizeNote(note)}</div>`;
            document.body.appendChild(container);
            return { note, container };
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
        const checks = rendered.map(({ note, container }) => ({
            sameText: container.textContent === note,
            executableElementCount: container.querySelectorAll('img, svg, script').length
        }));
        rendered.forEach(({ container }) => container.remove());
        return {
            triggered: window.__TENTEN_NOTE_XSS_TRIGGERED__,
            checks
        };
    });
    if (result.triggered || result.checks.some((check) => !check.sameText || check.executableElementCount !== 0)) {
        throw new Error(`note text rendering allowed executable HTML: ${JSON.stringify(result)}`);
    }
}

async function learnSectionQuestions(page, stage, section, start, count) {
    await page.evaluate(async ({ stageValue, sectionValue, startIndex, questionCount }) => {
        const questions = getUniqueSectionQuestions(stageValue, sectionValue);
        if (questions.length !== 25) throw new Error(`expected 25 questions, received ${questions.length}`);
        for (const question of questions.slice(startIndex, startIndex + questionCount)) {
            await recordQuestionAsLearned(question);
        }
    }, { stageValue: stage, sectionValue: section, startIndex: start, questionCount: count });
}

async function completeSectionMilestone(page, stage, section) {
    await page.evaluate(({ stageValue, sectionValue }) => {
        window.dispatchEvent(new CustomEvent('tenten-section-completed', {
            detail: {
                nativeLanguage: 'ko',
                learningLanguage: 'vi',
                stage: stageValue,
                section: sectionValue,
                questionCount: 25
            }
        }));
    }, { stageValue: stage, sectionValue: section });
}

(async () => {
    const port = await listen();
    const origin = `http://127.0.0.1:${port}`;
    const endpoint = `${origin}/test-firestore`;
    let browser = null;
    try {
        const executablePath = findBrowserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available');
        browser = await chromium.launch({ headless: true, executablePath });

        const firstContext = await browser.newContext({ acceptDownloads: true });
        const firstPage = await firstContext.newPage();
        await configurePage(firstPage, endpoint);
        await firstPage.goto(`${origin}/?native=ko&learn=vi`, { waitUntil: 'domcontentloaded' });
        await firstPage.waitForSelector('#cloud-backup-section:not([hidden])');
        await verifyNoteTextRendering(firstPage);
        await learnSectionQuestions(firstPage, 1, 'nature_weather', 0, 24);

        await firstPage.waitForTimeout(250);
        if (backups.size !== 0 || putCount !== 0) {
            throw new Error('ordinary learning changes must not create a cloud backup');
        }

        const initialAchievement = await firstPage.evaluate(() => (
            recordDailyQuizAchievement(new Date(), { dispatch: false }).achievement
        ));
        if (initialAchievement.currentStreak !== 1 || initialAchievement.bestStreak !== 1) {
            throw new Error('daily achievement was not prepared for encrypted recovery testing');
        }

        await learnSectionQuestions(firstPage, 1, 'nature_weather', 24, 1);
        await firstPage.waitForFunction(() => {
            const profile = window.TentenCloudBackup.readProfile();
            return profile && profile.lastSyncedAt && profile.dirty === false && profile.pendingMilestones.length === 0;
        });
        await firstPage.evaluate(() => {
            window.selectedQuizCategory = '1';
            window.selectedQuizSection = 'nature_weather';
            window.selectionStep = 'section';
            score = TOTAL_QUESTIONS;
            document.getElementById('section-select-screen').style.display = 'none';
            document.getElementById('quiz-card').style.display = 'none';
            document.getElementById('result-card').style.display = 'block';
            showPerfectScoreCelebration(TOTAL_QUESTIONS);
        });
        await firstPage.waitForTimeout(900);
        if (await firstPage.locator('dialog[open]').count() !== 0) {
            throw new Error('the first section milestone opened a blocking dialog over the result actions');
        }
        await firstPage.click('#result-back-same-btn');
        await firstPage.waitForSelector('.completed-section-btn .progress-complete-confetti');
        await firstPage.waitForFunction(() => (
            document.querySelector('.completed-section-btn .section-emoji')?.classList.contains('is-celebrating')
        ));
        await firstPage.click('#selection-back-btn');
        await firstPage.waitForSelector('#learning-records-manager:not([hidden])');
        const recoveryCode = await firstPage.evaluate(() => window.TentenCloudBackup.readProfile().recoveryCode);
        if (!recoveryCode || backups.size !== 1 || putCount !== 1) {
            throw new Error('initial encrypted cloud backup was not created');
        }
        const storedBody = Array.from(backups.values())[0].body;
        if (storedBody.includes('learningProgress') || storedBody.includes('nature_weather')) {
            throw new Error('plaintext learning data reached the mock server');
        }
        if (process.env.TENTEN_CLOUD_DIALOG_CAPTURE) {
            await firstPage.screenshot({ path: process.env.TENTEN_CLOUD_DIALOG_CAPTURE, fullPage: true });
        }

        await learnSectionQuestions(firstPage, 1, 'nature_weather', 0, 25);
        await firstPage.waitForTimeout(1500);
        if (putCount !== 1) throw new Error(`replaying a completed section created another backup: ${putCount}`);

        await addProgress(firstPage, 'cloud-progress-2');
        await firstPage.waitForTimeout(1500);
        if (putCount !== 1) throw new Error(`non-milestone change reached Firestore: ${putCount}`);
        await completeSectionMilestone(firstPage, 1, 'people_relations');
        await firstPage.waitForFunction(() => {
            const profile = window.TentenCloudBackup.readProfile();
            return profile && profile.dirty === true && profile.pendingMilestones.length > 0;
        });
        if (putCount !== 1) throw new Error(`same-day milestone ignored the daily upload limit: ${putCount}`);

        await firstPage.click('#cloud-backup-manage-open-btn');
        await firstPage.click('#cloud-backup-show-code-btn');
        await firstPage.waitForSelector('#cloud-backup-recovery-dialog[open]');
        await firstPage.waitForFunction(() => {
            const profile = window.TentenCloudBackup.readProfile();
            return profile && profile.recordCount === 26 && profile.dirty === false && profile.pendingMilestones.length === 0;
        });
        const acknowledgedProfile = await firstPage.evaluate(() => window.TentenCloudBackup.readProfile());
        if (acknowledgedProfile.needsRecoveryPrompt !== false) {
            throw new Error('explicitly viewing the recovery code did not acknowledge the pending notice');
        }
        if (putCount !== 2) throw new Error(`viewing the recovery code did not force a fresh backup: ${putCount}`);
        const refreshedRecoveryCode = (await firstPage.locator('#cloud-backup-recovery-code').textContent()).trim();
        if (refreshedRecoveryCode !== recoveryCode) throw new Error('forcing a fresh backup unexpectedly changed the recovery code');
        await firstPage.click('#cloud-backup-recovery-close-btn');
        if (process.env.TENTEN_CLOUD_CAPTURE) {
            await firstPage.screenshot({ path: process.env.TENTEN_CLOUD_CAPTURE, fullPage: true });
        }

        const secondContext = await browser.newContext({
            acceptDownloads: true,
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true
        });
        const secondPage = await secondContext.newPage();
        await configurePage(secondPage, endpoint);
        const secondPageDialogTypes = [];
        secondPage.on('dialog', (dialog) => {
            secondPageDialogTypes.push(dialog.type());
            dialog.accept();
        });
        await secondPage.goto(`${origin}/?native=ko&learn=vi`, { waitUntil: 'domcontentloaded' });
        await secondPage.click('#cloud-backup-manage-open-btn');
        await secondPage.click('#cloud-backup-restore-open-btn');
        await secondPage.fill('#cloud-backup-restore-code-input', recoveryCode.toLowerCase());
        await secondPage.evaluate(() => {
            window.__TENTEN_RESTORE_NAVIGATION_REQUESTED__ = false;
            // 일부 Android 카메라 WebView에서 close()가 호출돼도 open/top-layer가
            // 남는 현상을 흉내 내어 강제 해제 경로를 검증합니다.
            document.getElementById('cloud-backup-restore-dialog').close = () => {};
            window.TentenLearningRecords.reloadWithRestoredPreferences = () => {
                window.__TENTEN_RESTORE_NAVIGATION_REQUESTED__ = true;
            };
        });
        await secondPage.click('#cloud-backup-restore-form button[type="submit"]');
        await secondPage.waitForFunction(() => window.__TENTEN_RESTORE_NAVIGATION_REQUESTED__ === true);
        if (backups.size !== 0) {
            throw new Error(`a successfully restored recovery code still exists on the server: ${backups.size}`);
        }
        const consumedCodeRejected = await secondPage.evaluate(async (code) => {
            try {
                await window.TentenCloudBackup.fetchCloudBackup(code);
                return false;
            } catch (error) {
                return error && error.code === 'not-found';
            }
        }, recoveryCode);
        if (!consumedCodeRejected) throw new Error('the same recovery code was usable more than once');
        const consumedProfileStillLocal = await secondPage.evaluate(() => Boolean(window.TentenCloudBackup.readProfile()));
        if (consumedProfileStillLocal) throw new Error('the restored device kept the consumed recovery code locally');
        const releasedDialogState = await secondPage.evaluate(() => {
            const dialog = document.getElementById('cloud-backup-restore-dialog');
            const backdrop = getComputedStyle(dialog, '::backdrop');
            return {
                open: dialog.open || dialog.hasAttribute('open'),
                hidden: dialog.hidden,
                releasing: dialog.classList.contains('cloud-backup-dialog-releasing'),
                backdropColor: backdrop.backgroundColor,
                backdropFilter: backdrop.backdropFilter
            };
        });
        if (
            releasedDialogState.open || !releasedDialogState.hidden || !releasedDialogState.releasing
            || releasedDialogState.backdropColor !== 'rgba(0, 0, 0, 0)'
            || releasedDialogState.backdropFilter !== 'none'
        ) {
            throw new Error(`restore navigation kept a mobile dialog backdrop: ${JSON.stringify(releasedDialogState)}`);
        }
        if (secondPageDialogTypes.includes('alert')) {
            throw new Error('restore success alert opened before the mobile dialog backdrop was released');
        }
        await secondPage.reload({ waitUntil: 'domcontentloaded' });
        await secondPage.waitForFunction(() => Boolean(window.TentenLearningRecords && window.TentenCloudBackup));
        await secondPage.waitForSelector('#cloud-backup-toast.is-visible');
        const restoreNotice = (await secondPage.locator('#cloud-backup-toast').textContent()).trim();
        if (!restoreNotice.includes('26')) throw new Error(`restored-record toast is missing its count: ${restoreNotice}`);
        const restored = await secondPage.evaluate(() => window.TentenLearningRecords.createBackupPayload());
        if (restored.recordCount !== 26) throw new Error(`new-device restore returned ${restored.recordCount} records`);
        if (
            restored.dailyQuizAchievements?.length !== 1
            || restored.dailyQuizAchievements[0].currentStreak !== 1
            || restored.dailyQuizAchievements[0].bestStreak !== 1
        ) {
            throw new Error('new-device restore did not recover the daily streak achievement');
        }

        await addProgress(secondPage, 'cloud-progress-3');
        await completeSectionMilestone(secondPage, 2, 'nature_weather');
        await secondPage.waitForFunction(() => {
            const profile = window.TentenCloudBackup.readProfile();
            return profile && profile.dirty === true && profile.pendingMilestones.length > 0;
        });
        await secondPage.click('#cloud-backup-manage-open-btn');
        await secondPage.click('#cloud-backup-show-code-btn');
        await secondPage.waitForSelector('#cloud-backup-recovery-dialog[open]');
        await secondPage.waitForFunction(() => {
            const profile = window.TentenCloudBackup.readProfile();
            return profile && profile.recordCount === 27 && profile.dirty === false;
        });
        if (putCount !== 3) throw new Error(`new-device recovery-code view did not refresh the backup: ${putCount}`);
        const nextRecoveryCode = (await secondPage.locator('#cloud-backup-recovery-code').textContent()).trim();
        if (!nextRecoveryCode || nextRecoveryCode === recoveryCode) {
            throw new Error('the restored device did not issue a new recovery code after consuming the old one');
        }
        await secondPage.click('#cloud-backup-recovery-close-btn');

        const failureContext = await browser.newContext({ acceptDownloads: true });
        const failurePage = await failureContext.newPage();
        await configurePage(failurePage, endpoint);
        failurePage.on('dialog', (dialog) => dialog.accept());
        await failurePage.goto(`${origin}/?native=ko&learn=vi`, { waitUntil: 'domcontentloaded' });
        await addProgress(failurePage, 'local-record-before-delete-failure');
        await failurePage.evaluate(() => {
            window.__TENTEN_FIRESTORE_TEST_ADAPTER__.deleteBackup = async () => {
                const error = new Error('simulated delete failure');
                error.code = 'unavailable';
                throw error;
            };
        });
        const failedRestoreResult = await failurePage.evaluate(
            (code) => window.TentenCloudBackup.restoreFromCode(code),
            nextRecoveryCode
        );
        if (failedRestoreResult !== false) throw new Error('restore succeeded even though one-time deletion failed');
        const recordsAfterDeleteFailure = await failurePage.evaluate(
            () => window.TentenLearningRecords.createBackupPayload()
        );
        if (recordsAfterDeleteFailure.recordCount !== 1) {
            throw new Error(`delete failure did not restore the previous local records: ${recordsAfterDeleteFailure.recordCount}`);
        }
        if (backups.size !== 1) throw new Error('delete failure unexpectedly consumed the recovery backup');
        await failureContext.close();

        await addProgress(firstPage, 'cloud-progress-conflict');
        await completeSectionMilestone(firstPage, 2, 'people_relations');
        await firstPage.click('#cloud-backup-manage-open-btn');
        await firstPage.click('#cloud-backup-show-code-btn');
        await firstPage.waitForSelector('#cloud-backup-recovery-dialog[open]');
        await firstPage.waitForFunction(() => {
            const profile = window.TentenCloudBackup.readProfile();
            return profile && profile.recordCount === 27 && profile.dirty === false
                && profile.conflict === false && Boolean(profile.revision);
        });
        const rotatedOriginalCode = (await firstPage.locator('#cloud-backup-recovery-code').textContent()).trim();
        if (!rotatedOriginalCode || rotatedOriginalCode === recoveryCode || rotatedOriginalCode === nextRecoveryCode) {
            throw new Error('the original device revived a consumed code instead of rotating to a new one');
        }
        if (putCount !== 4 || backups.size !== 2) {
            throw new Error(`consumed-code rotation produced the wrong server state: puts=${putCount}, backups=${backups.size}`);
        }

        if (await secondPage.locator('#cloud-backup-delete-btn').count()) {
            throw new Error('cloud-backup deletion must not be exposed in the learner UI');
        }

        console.log('OK: the first section milestone stays non-blocking, returns to the completed section celebration, and uploads only encrypted data');
        console.log('OK: same-day milestones wait locally, while viewing the recovery code forces a fresh backup');
        console.log('OK: a recovery code restores all records, is deleted immediately, and cannot be reused');
        console.log('OK: the restored device issues a new code for its next cloud transfer');
        console.log('OK: a server deletion failure rolls the receiving device back without consuming the code');
        console.log('OK: the mobile restore dialog and native alert leave no backdrop before navigation');
        console.log('OK: the original device rotates to a new code instead of reviving a consumed one');
        console.log('OK: cloud-backup deletion is not exposed in the learner UI');
        console.log('OK: multilingual notes render as text and representative HTML payloads create no executable elements');

        await firstContext.close();
        await secondContext.close();
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
