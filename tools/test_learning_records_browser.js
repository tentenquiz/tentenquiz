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

async function listen() {
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

(async () => {
    const port = await listen();
    let browser = null;
    try {
        const executablePath = findBrowserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available for the browser test');
        browser = await chromium.launch({ headless: true, executablePath });
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true
        });
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${port}/?native=ko&learn=vi`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cloud-backup-manage-open-btn', { state: 'attached' });
        await page.waitForSelector('.stage-select-btn');

        const uiState = await page.evaluate(() => ({
            title: document.getElementById('learning-records-title').textContent.trim(),
            compactStatus: document.getElementById('cloud-backup-status').textContent.trim(),
            hasFileBackup: Boolean(document.getElementById('local-file-backup-details')),
            hasFileSave: Boolean(document.getElementById('learning-records-save-btn')),
            hasFileLoad: Boolean(document.getElementById('learning-records-load-btn')),
            hidden: document.getElementById('learning-records-manager').hidden
        }));
        if (uiState.title !== '학습 기록 관리' || uiState.compactStatus !== '학습 기록 안전 보관 중' || uiState.hasFileBackup || uiState.hasFileSave || uiState.hasFileLoad || uiState.hidden) {
            throw new Error(`learning-record UI is incorrect: ${JSON.stringify(uiState)}`);
        }
        await page.click('#cloud-backup-manage-open-btn');
        const manageStatus = await page.locator('#cloud-backup-manage-status').textContent();
        if (manageStatus.trim() !== '학습 기록을 안전하게 보관하고 있어요. 복구 코드를 사용하면 다른 기기에서도 이어서 학습할 수 있어요.') {
            throw new Error(`management dialog must explain record continuity without exposing the backup schedule: ${manageStatus}`);
        }
        const manageButtonStyles = await page.evaluate(() => {
            const showCode = getComputedStyle(document.getElementById('cloud-backup-show-code-btn'));
            const restore = getComputedStyle(document.getElementById('cloud-backup-restore-open-btn'));
            return {
                showCodeBackground: showCode.backgroundColor,
                restoreBackground: restore.backgroundColor,
                showCodeColor: showCode.color,
                restoreColor: restore.color
            };
        });
        if (manageButtonStyles.showCodeBackground !== manageButtonStyles.restoreBackground || manageButtonStyles.showCodeColor !== manageButtonStyles.restoreColor) {
            throw new Error(`cloud management buttons must share the same green style: ${JSON.stringify(manageButtonStyles)}`);
        }
        if (process.env.TENTEN_MANAGE_CAPTURE) {
            await page.screenshot({ path: process.env.TENTEN_MANAGE_CAPTURE, fullPage: true });
        }
        if (await page.locator('#cloud-backup-show-code-btn').isHidden()) {
            throw new Error('recovery-code button must be visible before the first milestone');
        }
        if (await page.locator('#cloud-backup-delete-btn').count()) {
            throw new Error('cloud-backup deletion must not be exposed in the learner UI');
        }
        await page.click('#cloud-backup-manage-close-btn');
        if (process.env.TENTEN_CAPTURE) {
            await page.screenshot({ path: process.env.TENTEN_CAPTURE, fullPage: true });
        }

        await page.evaluate(async () => {
            const database = await openTenTenDB();
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(['wrongBank', 'myWordbook', 'learningProgress'], 'readwrite');
                transaction.objectStore('wrongBank').put({ id: 'test-wrong', stage: 1, meaning: 'test' });
                transaction.objectStore('myWordbook').put({ id: 'test-word', stage: 1, meaning: 'test' });
                transaction.objectStore('learningProgress').put({ id: 'test-progress', stage: 1, section: 'nature_weather' });
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });
        });

        const payload = await page.evaluate(() => window.TentenLearningRecords.createBackupPayload());
        if (payload.recordCount !== 3 || payload.databases.length !== 1) {
            throw new Error(`browser backup payload is incorrect: ${JSON.stringify(payload)}`);
        }

        await page.evaluate(async (backup) => {
            const database = await openTenTenDB();
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(['wrongBank', 'myWordbook', 'learningProgress'], 'readwrite');
                transaction.objectStore('wrongBank').clear();
                transaction.objectStore('myWordbook').clear();
                transaction.objectStore('learningProgress').clear();
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });
            const validated = window.TentenLearningRecords.validateBackupPayload(backup);
            await window.TentenLearningRecords.replaceAllLearningRecords(validated);
        }, payload);

        const restored = await page.evaluate(() => window.TentenLearningRecords.createBackupPayload());
        if (restored.recordCount !== 3) throw new Error(`browser restore returned ${restored.recordCount} records`);

        await page.click('.stage-select-btn');
        await page.waitForFunction(() => document.getElementById('learning-records-manager').hidden === true);
        await page.evaluate(() => backToStageSelection());
        await page.waitForFunction(() => document.getElementById('learning-records-manager').hidden === false);

        console.log('OK: browser backup data still covers progress, wrong answers, and wordbook data');
        console.log('OK: file-backup controls are absent from the learning-record manager');
        console.log('OK: compact card uses the short cloud-save label while the dialog keeps the detailed explanation');
        console.log('OK: recovery-code and other-device buttons share the same green style');
        console.log('OK: learning-record manager appears only on the stage-selection screen');
        await context.close();
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
