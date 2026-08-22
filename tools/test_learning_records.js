const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(projectRoot, 'learning-records.js'), 'utf8');
const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const storage = new Map();
const languages = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'fr', 'de', 'es', 'vi', 'ar', 'it', 'ru'];
const localStorage = {
    get length() { return storage.size; },
    key: (index) => Array.from(storage.keys())[index] || null,
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
};
const window = {
    TENTEN_LANGUAGES: languages.map((code) => ({ code })),
    tentenGlobal: { interfaceLanguage: 'ko', learningLanguage: 'vi', chineseReading: 'pinyin' },
    localStorage,
    document: {
        readyState: 'loading',
        addEventListener: () => {}
    },
    indexedDB: {}
};

const context = { window, console, Date, Intl, JSON, Map, Set, Promise, Object, Array, String, Number, Error };
vm.createContext(context);
vm.runInContext(source, context);

const records = window.TentenLearningRecords;
if (!records) throw new Error('learning-record API was not exposed');
if (records.getAllowedDatabaseNames().size !== 132) {
    throw new Error('learning-record backup must support all 132 valid language pairs');
}

const validPayload = {
    format: 'tentenquiz-learning-records',
    version: 1,
    exportedAt: '2026-08-19T10:00:00.000Z',
    preferences: { interfaceLanguage: 'ko', learningLanguage: 'vi', chineseReading: 'pinyin' },
    dailyQuizAchievements: [{
        version: 1,
        nativeLanguage: 'ko',
        learningLanguage: 'vi',
        currentStreak: 3,
        bestStreak: 5,
        totalClearDays: 8,
        lastClearDate: '2026-08-19',
        lastCompletedAt: 1787133600000,
        timeZone: 'Asia/Seoul',
        completedDates: ['2026-08-17', '2026-08-18', '2026-08-19']
    }],
    databases: [{
        name: 'tenTenQuizGlobalDB_ko_to_vi',
        stores: {
            wrongBank: [{ id: 'wrong-1', stage: 1 }],
            myWordbook: [{ id: 'word-1', stage: 1 }],
            learningProgress: [{ id: 'progress-1', stage: 1, section: 'nature_weather' }]
        }
    }]
};
const normalized = records.validateBackupPayload(validPayload);
if (normalized.recordCount !== 3 || records.countBackupRecords(normalized) !== 3) {
    throw new Error('backup record count is incorrect');
}
if (normalized.dailyQuizAchievements.length !== 1 || normalized.dailyQuizAchievements[0].bestStreak !== 5) {
    throw new Error('daily quiz achievement was not validated');
}
records.restoreDailyQuizAchievements(normalized.dailyQuizAchievements);
const restoredAchievement = JSON.parse(storage.get('tenten.dailyQuizAchievement.v1.ko.to.vi'));
if (restoredAchievement.currentStreak !== 3 || restoredAchievement.bestStreak !== 5) {
    throw new Error('daily quiz achievement was not restored');
}

function expectInvalid(mutator, label) {
    const payload = JSON.parse(JSON.stringify(validPayload));
    mutator(payload);
    let rejected = false;
    try {
        records.validateBackupPayload(payload);
    } catch (_error) {
        rejected = true;
    }
    if (!rejected) throw new Error(`invalid backup was accepted: ${label}`);
}

expectInvalid((payload) => { payload.format = 'other-app'; }, 'foreign format');
expectInvalid((payload) => { payload.version = 99; }, 'unsupported version');
expectInvalid((payload) => { payload.preferences.learningLanguage = 'ko'; }, 'matching language pair');
expectInvalid((payload) => { payload.databases[0].name = 'untrusted-database'; }, 'untrusted database name');
expectInvalid((payload) => { payload.databases[0].stores.wrongBank[0].id = ''; }, 'missing record id');
expectInvalid((payload) => { payload.databases.push(payload.databases[0]); }, 'duplicate database');
expectInvalid((payload) => { payload.dailyQuizAchievements[0].currentStreak = 6; }, 'streak greater than best record');
expectInvalid((payload) => { payload.dailyQuizAchievements.push(payload.dailyQuizAchievements[0]); }, 'duplicate daily quiz achievement');

const managerStart = html.indexOf('id="learning-records-manager"');
const sectionScreenEnd = html.indexOf('</div>', managerStart);
const faqStart = html.indexOf('class="info-accordion"');
if (managerStart < 0 || sectionScreenEnd < managerStart || faqStart < managerStart) {
    throw new Error('learning-record controls are not placed below the stage grid and before the FAQ');
}
if (html.includes('id="local-file-backup-details"') || html.includes('id="learning-records-save-btn"') || html.includes('id="learning-records-load-btn"')) {
    throw new Error('file-backup controls must not appear in the learning-record manager');
}
if (!html.includes('id="cloud-backup-show-code-btn" class="learning-records-btn cloud-backup-primary-btn"') ||
    !html.includes('id="cloud-backup-restore-open-btn" class="learning-records-btn cloud-backup-primary-btn"')) {
    throw new Error('both cloud recovery actions must use the same primary green style');
}
if (html.includes('id="cloud-backup-delete-btn"')) {
    throw new Error('cloud-backup deletion must not be exposed in the learner UI');
}
if (!source.includes("downloadPayload(currentPayload, 'tentenquiz-before-restore')")) {
    throw new Error('restore must save the current records as a safety backup first');
}

console.log('OK: 132 language-pair databases can be backed up in one validated file');
console.log('OK: invalid, foreign, duplicate, and unsafe backups are rejected');
console.log('OK: restore creates a safety backup before replacing current records');
console.log('OK: encrypted backup validation and restore include daily streak achievements');
console.log('OK: file/delete controls are absent and cloud recovery actions share one style');
