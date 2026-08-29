(function initializeLearningRecords(global) {
    'use strict';

    const BACKUP_FORMAT = 'tentenquiz-learning-records';
    const BACKUP_VERSION = 1;
    const DATABASE_VERSION = 3;
    const DATABASE_PREFIX = 'tenTenQuizGlobalDB_';
    const DATABASE_REGISTRY_KEY = 'tenten.databaseRegistry';
    const DAILY_QUIZ_ACHIEVEMENT_PREFIX = 'tenten.dailyQuizAchievement.v1.';
    const DAILY_QUIZ_ACHIEVEMENT_VERSION = 1;
    const MAX_DAILY_QUIZ_ACHIEVEMENTS = 132;
    const MAX_DAILY_QUIZ_DATES = 800;
    // 이 값을 넘으면 정상 데이터로 보지 않고 거부합니다(신뢰할 수 없는 백업 파일 방어).
    // MAX_DAILY_QUIZ_DATES 와 이 값 사이는 잘라내기만 합니다.
    const ABSURD_DAILY_QUIZ_DATE_COUNT = 100000;
    const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
    const MAX_TOTAL_RECORDS = 1000000;
    const MAX_RECORD_NOTE_LENGTH = 2000;
    const STORE_DEFINITIONS = {
        wrongBank: [{ name: 'stage', keyPath: 'stage' }],
        myWordbook: [{ name: 'stage', keyPath: 'stage' }],
        learningProgress: [
            { name: 'stage', keyPath: 'stage' },
            { name: 'section', keyPath: 'section' }
        ]
    };
    const STORE_NAMES = Object.keys(STORE_DEFINITIONS);

    function translate(key, values = {}) {
        return typeof global.tentenT === 'function' ? global.tentenT(key, values) : key;
    }

    function getLanguageCodes() {
        return Array.isArray(global.TENTEN_LANGUAGES)
            ? global.TENTEN_LANGUAGES.map((language) => String(language.code))
            : [];
    }

    function getAllowedDatabaseNames() {
        const names = new Set();
        const languageCodes = getLanguageCodes();
        languageCodes.forEach((nativeLanguage) => {
            languageCodes.forEach((learningLanguage) => {
                if (nativeLanguage !== learningLanguage) {
                    names.add(`${DATABASE_PREFIX}${nativeLanguage}_to_${learningLanguage}`);
                }
            });
        });
        return names;
    }

    function getCurrentDatabaseName() {
        const preferences = global.tentenGlobal || {};
        return `${DATABASE_PREFIX}${String(preferences.interfaceLanguage || 'ko')}_to_${String(preferences.learningLanguage || 'ja')}`;
    }

    function dailyQuizAchievementStorageKey(nativeLanguage, learningLanguage) {
        return `${DAILY_QUIZ_ACHIEVEMENT_PREFIX}${encodeURIComponent(nativeLanguage)}.to.${encodeURIComponent(learningLanguage)}`;
    }

    function validDateKey(value) {
        const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return false;
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    }

    function normalizeDailyQuizAchievement(record, languageCodes = new Set(getLanguageCodes())) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid daily quiz achievement');
        const nativeLanguage = String(record.nativeLanguage || '');
        const learningLanguage = String(record.learningLanguage || '');
        if (
            Number(record.version) !== DAILY_QUIZ_ACHIEVEMENT_VERSION
            || !languageCodes.has(nativeLanguage)
            || !languageCodes.has(learningLanguage)
            || nativeLanguage === learningLanguage
        ) {
            throw new Error('Invalid daily quiz language pair');
        }
        const rawDates = Array.from(new Set(Array.isArray(record.completedDates) ? record.completedDates.map(String) : []));
        // 상한을 넘겼다고 기록 전체를 버리면 안 됩니다.
        // 예전에는 length > MAX_DAILY_QUIZ_DATES 일 때 throw 했고,
        // 호출부(collectDailyQuizAchievements)가 이 예외를 잡아
        // "손상된 기록"으로 간주해 백업에서 통째로 제외했습니다.
        // 즉 상한을 넘긴 순간 연속 기록 전체가 조용히 사라졌습니다.
        // script.js 의 같은 이름 함수는 slice 로 잘라내므로 동작도 서로 달랐습니다.
        // 여기서도 잘라내는 쪽으로 통일합니다 (잘림 < 전체 유실).
        if (rawDates.length > ABSURD_DAILY_QUIZ_DATE_COUNT || !rawDates.every(validDateKey)) {
            throw new Error('Invalid daily quiz completion dates');
        }
        rawDates.sort();
        const completedDates = rawDates.slice(-MAX_DAILY_QUIZ_DATES);
        const lastClearDate = String(record.lastClearDate || '');
        if (lastClearDate && !validDateKey(lastClearDate)) throw new Error('Invalid daily quiz last date');
        const currentStreak = Math.floor(Number(record.currentStreak) || 0);
        const bestStreak = Math.floor(Number(record.bestStreak) || 0);
        const totalClearDays = Math.floor(Number(record.totalClearDays) || 0);
        const lastCompletedAt = Math.floor(Number(record.lastCompletedAt) || 0);
        if (
            currentStreak < 0 || bestStreak < currentStreak || totalClearDays < completedDates.length
            || bestStreak > 1000000 || totalClearDays > 1000000 || lastCompletedAt < 0
        ) {
            throw new Error('Invalid daily quiz streak values');
        }
        return {
            version: DAILY_QUIZ_ACHIEVEMENT_VERSION,
            nativeLanguage,
            learningLanguage,
            currentStreak,
            bestStreak,
            totalClearDays,
            lastClearDate,
            lastCompletedAt,
            timeZone: String(record.timeZone || 'UTC').slice(0, 80),
            completedDates
        };
    }

    function collectDailyQuizAchievements() {
        const achievements = [];
        const languageCodes = new Set(getLanguageCodes());
        const length = Math.max(0, Number(global.localStorage.length) || 0);
        for (let index = 0; index < length; index += 1) {
            const key = typeof global.localStorage.key === 'function' ? global.localStorage.key(index) : '';
            if (!String(key || '').startsWith(DAILY_QUIZ_ACHIEVEMENT_PREFIX)) continue;
            try {
                achievements.push(normalizeDailyQuizAchievement(
                    JSON.parse(global.localStorage.getItem(key) || 'null'),
                    languageCodes
                ));
            } catch (error) {
                console.warn('백업에서 제외한 손상된 오늘의 퀴즈 기록:', error);
            }
        }
        return achievements
            .sort((first, second) => `${first.nativeLanguage}:${first.learningLanguage}`.localeCompare(`${second.nativeLanguage}:${second.learningLanguage}`))
            .slice(0, MAX_DAILY_QUIZ_ACHIEVEMENTS);
    }

    function dateKeyToOrdinal(dateKey) {
        const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return NaN;
        return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
    }

    function ordinalToDateKey(ordinal) {
        return new Date(ordinal * 86400000).toISOString().slice(0, 10);
    }

    // completedDates 로부터 lastClearDate 기준 역방향 연속 일수를 다시 셉니다.
    //
    // 예전에는 두 기기의 completedDates 를 합집합으로 병합해놓고 currentStreak 은
    // "lastClearDate 가 더 최신인 쪽의 값"을 그대로 가져왔습니다. 그래서
    //   폰    : 08-01~08-19 매일 만점 (lastClearDate=08-19, currentStreak=19)
    //   태블릿: 08-20 하루만 만점    (lastClearDate=08-20, currentStreak=1)
    // 를 병합하면 정답인 20 이 아니라 1 이 되어 19일치가 사라졌습니다.
    // 정보는 completedDates 에 이미 다 들어 있으므로 다시 세면 됩니다.
    function recomputeStreak(completedDates, lastClearDate) {
        const startOrdinal = dateKeyToOrdinal(lastClearDate);
        if (!Number.isFinite(startOrdinal)) return { streak: 0, truncated: false };

        const available = new Set(completedDates);
        let ordinal = startOrdinal;
        let streak = 0;
        while (available.has(ordinalToDateKey(ordinal))) {
            streak += 1;
            ordinal -= 1;
        }

        // completedDates 는 MAX_DAILY_QUIZ_DATES 개로 잘려 있으므로,
        // 연속 기록이 배열 전체를 소진했다면 실제 기록은 더 길 수 있습니다.
        return { streak, truncated: streak >= completedDates.length };
    }

    function mergeDailyQuizAchievement(first, second) {
        const completedDates = Array.from(new Set([
            ...(first.completedDates || []),
            ...(second.completedDates || [])
        ])).sort().slice(-MAX_DAILY_QUIZ_DATES);
        const latest = String(second.lastClearDate || '') > String(first.lastClearDate || '') ? second : first;

        const recomputed = recomputeStreak(completedDates, latest.lastClearDate);
        // 잘림이 발생했을 때만 저장값을 하한으로 사용합니다.
        const currentStreak = recomputed.truncated
            ? Math.max(recomputed.streak, first.currentStreak, second.currentStreak)
            : recomputed.streak;

        return {
            ...latest,
            currentStreak,
            bestStreak: Math.max(first.bestStreak, second.bestStreak, currentStreak),
            totalClearDays: Math.max(first.totalClearDays, second.totalClearDays, completedDates.length),
            lastCompletedAt: Math.max(first.lastCompletedAt, second.lastCompletedAt),
            completedDates
        };
    }

    function restoreDailyQuizAchievements(incomingAchievements) {
        const languageCodes = new Set(getLanguageCodes());
        const merged = new Map();
        [...collectDailyQuizAchievements(), ...(incomingAchievements || [])].forEach((record) => {
            const normalized = normalizeDailyQuizAchievement(record, languageCodes);
            const pairKey = `${normalized.nativeLanguage}:${normalized.learningLanguage}`;
            merged.set(pairKey, merged.has(pairKey)
                ? mergeDailyQuizAchievement(merged.get(pairKey), normalized)
                : normalized);
        });
        merged.forEach((record) => {
            global.localStorage.setItem(
                dailyQuizAchievementStorageKey(record.nativeLanguage, record.learningLanguage),
                JSON.stringify(record)
            );
        });
    }

    function readDatabaseRegistry() {
        try {
            const parsed = JSON.parse(global.localStorage.getItem(DATABASE_REGISTRY_KEY) || '[]');
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch (_error) {
            return [];
        }
    }

    function registerDatabaseName(databaseName) {
        if (!getAllowedDatabaseNames().has(databaseName)) return;
        const names = new Set(readDatabaseRegistry());
        names.add(databaseName);
        global.localStorage.setItem(DATABASE_REGISTRY_KEY, JSON.stringify(Array.from(names).sort()));
    }

    function createStoreSchema(database, upgradeTransaction) {
        Object.entries(STORE_DEFINITIONS).forEach(([storeName, indexes]) => {
            let store;
            if (!database.objectStoreNames.contains(storeName)) {
                store = database.createObjectStore(storeName, { keyPath: 'id' });
            } else if (upgradeTransaction) {
                store = upgradeTransaction.objectStore(storeName);
            }

            if (!store) return;
            indexes.forEach((index) => {
                if (!store.indexNames.contains(index.name)) {
                    store.createIndex(index.name, index.keyPath, { unique: false });
                }
            });
        });
    }

    function openDatabase(databaseName) {
        if (!getAllowedDatabaseNames().has(databaseName)) {
            return Promise.reject(new Error('Unsupported TentenQuiz database name'));
        }

        registerDatabaseName(databaseName);
        return new Promise((resolve, reject) => {
            const request = global.indexedDB.open(databaseName, DATABASE_VERSION);
            request.onupgradeneeded = (event) => {
                createStoreSchema(event.target.result, event.target.transaction);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
            request.onblocked = () => reject(new Error('IndexedDB open was blocked'));
        });
    }

    async function mapWithConcurrency(items, concurrency, worker) {
        const results = new Array(items.length);
        let cursor = 0;

        async function runNext() {
            while (cursor < items.length) {
                const index = cursor;
                cursor += 1;
                results[index] = await worker(items[index], index);
            }
        }

        const workerCount = Math.min(concurrency, items.length);
        await Promise.all(Array.from({ length: workerCount }, () => runNext()));
        return results;
    }

    async function getExistingDatabaseNames() {
        const allowedNames = getAllowedDatabaseNames();
        const names = new Set(readDatabaseRegistry());
        names.add(getCurrentDatabaseName());

        if (typeof global.indexedDB.databases === 'function') {
            try {
                const databaseInfos = await global.indexedDB.databases();
                databaseInfos.forEach((info) => {
                    if (info && info.name) names.add(String(info.name));
                });
            } catch (_error) {
                // 등록 목록과 현재 언어 조합을 사용하여 계속 진행합니다.
            }
        }

        return Array.from(names).filter((name) => allowedNames.has(name)).sort();
    }

    async function readDatabaseRecords(databaseName) {
        const database = await openDatabase(databaseName);
        try {
            return await new Promise((resolve, reject) => {
                const transaction = database.transaction(STORE_NAMES, 'readonly');
                const stores = {};
                let settled = false;

                STORE_NAMES.forEach((storeName) => {
                    const request = transaction.objectStore(storeName).getAll();
                    request.onsuccess = () => { stores[storeName] = request.result || []; };
                });

                transaction.oncomplete = () => {
                    settled = true;
                    resolve(stores);
                };
                transaction.onerror = () => {
                    if (!settled) reject(transaction.error || new Error('IndexedDB read failed'));
                };
                transaction.onabort = () => {
                    if (!settled) reject(transaction.error || new Error('IndexedDB read aborted'));
                };
            });
        } finally {
            database.close();
        }
    }

    async function replaceDatabaseRecords(databaseName, stores) {
        const database = await openDatabase(databaseName);
        try {
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(STORE_NAMES, 'readwrite');
                STORE_NAMES.forEach((storeName) => {
                    const store = transaction.objectStore(storeName);
                    store.clear();
                    (stores[storeName] || []).forEach((record) => store.put(record));
                });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error || new Error('IndexedDB restore failed'));
                transaction.onabort = () => reject(transaction.error || new Error('IndexedDB restore aborted'));
            });
        } finally {
            database.close();
        }
    }

    function countBackupRecords(payload) {
        return (payload.databases || []).reduce((databaseTotal, database) => (
            databaseTotal + STORE_NAMES.reduce(
                (storeTotal, storeName) => storeTotal + (database.stores[storeName] || []).length,
                0
            )
        ), 0);
    }

    async function createBackupPayload() {
        const databaseNames = await getExistingDatabaseNames();
        const snapshots = await mapWithConcurrency(databaseNames, 4, async (databaseName) => {
            const stores = await readDatabaseRecords(databaseName);
            const recordCount = STORE_NAMES.reduce((total, storeName) => total + stores[storeName].length, 0);
            return recordCount > 0 ? { name: databaseName, stores } : null;
        });

        const payload = {
            format: BACKUP_FORMAT,
            version: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            preferences: {
                interfaceLanguage: String((global.tentenGlobal && global.tentenGlobal.interfaceLanguage) || 'ko'),
                learningLanguage: String((global.tentenGlobal && global.tentenGlobal.learningLanguage) || 'ja'),
                chineseReading: String((global.tentenGlobal && global.tentenGlobal.chineseReading) || 'pinyin')
            },
            dailyQuizAchievements: collectDailyQuizAchievements(),
            databases: snapshots.filter(Boolean)
        };
        payload.recordCount = countBackupRecords(payload);
        return payload;
    }

    function validateRecord(record) {
        return record && typeof record === 'object' && !Array.isArray(record)
            && typeof record.id === 'string' && record.id.length > 0
            && (record.note === undefined || (
                typeof record.note === 'string' && record.note.length <= MAX_RECORD_NOTE_LENGTH
            ));
    }

    function validateBackupPayload(payload) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new Error('Invalid backup object');
        }
        if (payload.format !== BACKUP_FORMAT || payload.version !== BACKUP_VERSION) {
            throw new Error('Unsupported backup format');
        }
        if (!payload.exportedAt || Number.isNaN(Date.parse(payload.exportedAt))) {
            throw new Error('Invalid backup date');
        }
        if (!Array.isArray(payload.databases) || payload.databases.length > getAllowedDatabaseNames().size) {
            throw new Error('Invalid database list');
        }
        const languageCodes = new Set(getLanguageCodes());
        const rawAchievements = payload.dailyQuizAchievements === undefined ? [] : payload.dailyQuizAchievements;
        if (!Array.isArray(rawAchievements) || rawAchievements.length > MAX_DAILY_QUIZ_ACHIEVEMENTS) {
            throw new Error('Invalid daily quiz achievement list');
        }
        const achievementPairs = new Set();
        const dailyQuizAchievements = rawAchievements.map((record) => {
            const normalized = normalizeDailyQuizAchievement(record, languageCodes);
            const pairKey = `${normalized.nativeLanguage}:${normalized.learningLanguage}`;
            if (achievementPairs.has(pairKey)) throw new Error('Duplicate daily quiz achievement');
            achievementPairs.add(pairKey);
            return normalized;
        });

        const allowedNames = getAllowedDatabaseNames();
        const seenNames = new Set();
        let totalRecords = 0;
        const databases = payload.databases.map((database) => {
            if (!database || typeof database !== 'object' || !allowedNames.has(database.name) || seenNames.has(database.name)) {
                throw new Error('Invalid or duplicate database name');
            }
            seenNames.add(database.name);
            if (!database.stores || typeof database.stores !== 'object') {
                throw new Error('Invalid database stores');
            }

            const stores = {};
            STORE_NAMES.forEach((storeName) => {
                const records = database.stores[storeName];
                if (!Array.isArray(records) || !records.every(validateRecord)) {
                    throw new Error(`Invalid records in ${storeName}`);
                }
                totalRecords += records.length;
                stores[storeName] = records;
            });
            return { name: database.name, stores };
        });

        if (totalRecords > MAX_TOTAL_RECORDS) throw new Error('Backup contains too many records');

        const preferences = payload.preferences || {};
        if (
            !languageCodes.has(preferences.interfaceLanguage)
            || !languageCodes.has(preferences.learningLanguage)
            || preferences.interfaceLanguage === preferences.learningLanguage
            || !['pinyin', 'zhuyin'].includes(preferences.chineseReading)
        ) {
            throw new Error('Invalid language preferences');
        }

        return {
            format: BACKUP_FORMAT,
            version: BACKUP_VERSION,
            exportedAt: new Date(payload.exportedAt).toISOString(),
            recordCount: totalRecords,
            preferences: {
                interfaceLanguage: preferences.interfaceLanguage,
                learningLanguage: preferences.learningLanguage,
                chineseReading: preferences.chineseReading
            },
            dailyQuizAchievements,
            databases
        };
    }

    function restorePreferences(preferences) {
        if (!preferences) return;
        global.localStorage.setItem('tenten.interfaceLanguage', preferences.interfaceLanguage);
        global.localStorage.setItem('tenten.learningLanguage', preferences.learningLanguage);
        global.localStorage.setItem('tenten.chineseReading', preferences.chineseReading);
        if (global.tentenGlobal) Object.assign(global.tentenGlobal, preferences);
    }

    async function replaceAllLearningRecords(payload) {
        const incomingByName = new Map(payload.databases.map((database) => [database.name, database.stores]));
        const existingNames = await getExistingDatabaseNames();
        const targetNames = Array.from(new Set([...existingNames, ...incomingByName.keys()])).sort();

        await mapWithConcurrency(targetNames, 4, (databaseName) => replaceDatabaseRecords(
            databaseName,
            incomingByName.get(databaseName) || Object.fromEntries(STORE_NAMES.map((name) => [name, []]))
        ));
        restoreDailyQuizAchievements(payload.dailyQuizAchievements || []);
        restorePreferences(payload.preferences);
    }

    function makeTimestampForFile(date = new Date()) {
        return date.toISOString().replace(/[:.]/g, '-');
    }

    function downloadPayload(payload, prefix = 'tentenquiz-learning-records') {
        const blob = new global.Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = global.URL.createObjectURL(blob);
        const anchor = global.document.createElement('a');
        anchor.href = url;
        anchor.download = `${prefix}-${makeTimestampForFile(new Date())}.tentenbackup`;
        anchor.hidden = true;
        global.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        global.setTimeout(() => global.URL.revokeObjectURL(url), 1000);
    }

    function readFileAsText(file) {
        if (typeof file.text === 'function') return file.text();
        return new Promise((resolve, reject) => {
            const reader = new global.FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('File read failed'));
            reader.readAsText(file);
        });
    }

    function formatBackupDate(value) {
        const locale = global.document.documentElement.lang || undefined;
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    }

    async function requestPersistentStorage() {
        if (!global.navigator.storage || typeof global.navigator.storage.persist !== 'function') return false;
        try {
            return await global.navigator.storage.persist();
        } catch (_error) {
            return false;
        }
    }

    function reloadWithRestoredPreferences() {
        if (typeof global.buildTentenPreferenceUrl === 'function') {
            global.location.assign(global.buildTentenPreferenceUrl(global.location.href));
        } else {
            global.location.reload();
        }
    }

    function initializeLearningRecordControls() {
        registerDatabaseName(getCurrentDatabaseName());

        const manager = global.document.getElementById('learning-records-manager');
        const saveButton = global.document.getElementById('learning-records-save-btn');
        const loadButton = global.document.getElementById('learning-records-load-btn');
        const fileInput = global.document.getElementById('learning-records-file-input');
        const status = global.document.getElementById('learning-records-status');
        if (!manager || !saveButton || !loadButton || !fileInput || !status) return;

        const setBusy = (busy, statusKey) => {
            manager.setAttribute('aria-busy', String(busy));
            saveButton.disabled = busy;
            loadButton.disabled = busy;
            if (statusKey) status.textContent = translate(statusKey);
        };

        saveButton.addEventListener('click', async () => {
            setBusy(true, 'learningRecordsSaving');
            try {
                const payload = await createBackupPayload();
                downloadPayload(payload);
                await requestPersistentStorage();
                status.textContent = translate('learningRecordsSaveSuccess', { count: payload.recordCount });
            } catch (error) {
                console.error('학습 기록 저장 실패:', error);
                status.textContent = translate('learningRecordsError');
                global.alert(translate('learningRecordsError'));
            } finally {
                setBusy(false);
            }
        });

        loadButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files && fileInput.files[0];
            fileInput.value = '';
            if (!file) return;
            if (file.size > MAX_BACKUP_BYTES) {
                global.alert(translate('learningRecordsInvalid'));
                return;
            }

            setBusy(true, 'learningRecordsLoading');
            try {
                const text = await readFileAsText(file);
                let incomingPayload;
                try {
                    incomingPayload = validateBackupPayload(JSON.parse(text));
                } catch (validationError) {
                    console.warn('잘못된 학습 기록 파일:', validationError);
                    status.textContent = translate('learningRecordsInvalid');
                    global.alert(translate('learningRecordsInvalid'));
                    return;
                }
                const shouldContinue = global.confirm(translate('learningRecordsLoadConfirm', {
                    date: formatBackupDate(incomingPayload.exportedAt),
                    count: incomingPayload.recordCount
                }));
                if (!shouldContinue) {
                    status.textContent = translate('learningRecordsStatus');
                    return;
                }

                const currentPayload = await createBackupPayload();
                if (currentPayload.recordCount > 0 || currentPayload.dailyQuizAchievements.length > 0) {
                    downloadPayload(currentPayload, 'tentenquiz-before-restore');
                }

                try {
                    await replaceAllLearningRecords(incomingPayload);
                } catch (restoreError) {
                    try {
                        await replaceAllLearningRecords(currentPayload);
                    } catch (rollbackError) {
                        console.error('학습 기록 자동 복구 실패:', rollbackError);
                    }
                    throw restoreError;
                }

                status.textContent = translate('learningRecordsLoadSuccess', { count: incomingPayload.recordCount });
                global.alert(translate('learningRecordsLoadSuccess', { count: incomingPayload.recordCount }));
                reloadWithRestoredPreferences();
            } catch (error) {
                console.error('학습 기록 불러오기 실패:', error);
                status.textContent = translate('learningRecordsError');
                global.alert(translate('learningRecordsError'));
            } finally {
                setBusy(false);
            }
        });
    }

    global.TentenLearningRecords = {
        createBackupPayload,
        validateBackupPayload,
        replaceAllLearningRecords,
        countBackupRecords,
        collectDailyQuizAchievements,
        restoreDailyQuizAchievements,
        getAllowedDatabaseNames,
        downloadPayload,
        reloadWithRestoredPreferences
    };

    if (global.document.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', initializeLearningRecordControls, { once: true });
    } else {
        initializeLearningRecordControls();
    }
})(window);
