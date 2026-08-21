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
        await firstPage.waitForSelector('#cloud-backup-recovery-dialog[open]');
        await firstPage.waitForFunction(() => document.querySelectorAll('#cloud-backup-qr svg').length === 1);
        const recoveryCode = (await firstPage.locator('#cloud-backup-recovery-code').textContent()).trim();
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
        await firstPage.click('#cloud-backup-recovery-close-btn');

        await learnSectionQuestions(firstPage, 1, 'nature_weather', 0, 25);
        await firstPage.waitForTimeout(1500);
        if (putCount !== 1) throw new Error(`replaying a completed section created another backup: ${putCount}`);

        await addProgress(firstPage, 'cloud-progress-2');
        await firstPage.waitForTimeout(1500);
        if (putCount !== 1) throw new Error(`non-milestone change reached Firestore: ${putCount}`);
        await completeSectionMilestone(firstPage, 1, 'people_relations');
        await firstPage.waitForFunction(() => {
            const profile = window.TentenCloudBackup.readProfile();
            return profile && profile.recordCount === 26 && profile.dirty === false;
        });
        if (putCount !== 2) throw new Error(`second milestone backup did not run: ${putCount}`);
        if (process.env.TENTEN_CLOUD_CAPTURE) {
            await firstPage.screenshot({ path: process.env.TENTEN_CLOUD_CAPTURE, fullPage: true });
        }

        const secondContext = await browser.newContext({ acceptDownloads: true });
        const secondPage = await secondContext.newPage();
        await configurePage(secondPage, endpoint);
        secondPage.on('dialog', (dialog) => dialog.accept());
        await secondPage.goto(`${origin}/?native=ko&learn=vi`, { waitUntil: 'domcontentloaded' });
        await secondPage.click('#cloud-backup-manage-open-btn');
        await secondPage.click('#cloud-backup-restore-open-btn');
        await secondPage.fill('#cloud-backup-restore-code-input', recoveryCode.toLowerCase());
        await Promise.all([
            secondPage.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            secondPage.click('#cloud-backup-restore-form button[type="submit"]')
        ]);
        await secondPage.waitForFunction(() => Boolean(window.TentenLearningRecords && window.TentenCloudBackup));
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
            return profile && profile.recordCount === 27 && profile.dirty === false;
        });

        await addProgress(firstPage, 'cloud-progress-conflict');
        await completeSectionMilestone(firstPage, 2, 'people_relations');
        await firstPage.waitForFunction(() => {
            const profile = window.TentenCloudBackup.readProfile();
            return profile && profile.conflict === true;
        });
        const conflictText = (await firstPage.locator('#cloud-backup-status').textContent()).trim();
        if (!conflictText.includes('다른 기기')) throw new Error(`conflict was not explained: ${conflictText}`);

        await secondPage.click('#cloud-backup-manage-open-btn');
        await secondPage.click('#cloud-backup-delete-btn');
        await secondPage.waitForFunction(() => window.TentenCloudBackup.readProfile() === null);
        if (backups.size !== 0) throw new Error('cloud backup was not deleted');
        const recordsAfterDelete = await secondPage.evaluate(() => window.TentenLearningRecords.createBackupPayload());
        if (recordsAfterDelete.recordCount !== 27) throw new Error('deleting cloud backup removed local records');
        if (recordsAfterDelete.dailyQuizAchievements?.[0]?.bestStreak !== 1) {
            throw new Error('deleting cloud backup removed the local daily streak');
        }

        console.log('OK: ordinary learning changes stay local and the first section milestone uploads only encrypted data');
        console.log('OK: replaying a completed section creates no backup, while a new milestone creates exactly one');
        console.log('OK: a recovery code restores all records and daily streak achievements on a new browser profile');
        console.log('OK: stale devices cannot silently overwrite newer cloud records');
        console.log('OK: deleting the cloud copy preserves local learning records');

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
