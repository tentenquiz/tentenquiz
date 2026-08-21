// ===================== db.js =====================
// IndexedDB 기반 "오답 클리어하기" / "내 단어장" 저장소
// ===================================================

// 하나의 글로벌 앱을 사용하되 모국어 + 학습 언어 조합별로
// 오답·단어장·진도를 완전히 분리합니다.
const TENTEN_LEARNING_LANGUAGE_CODE = String(
    window.tentenGlobal && window.tentenGlobal.learningLanguage
        ? window.tentenGlobal.learningLanguage
        : 'ja'
);
const TENTEN_INTERFACE_LANGUAGE_CODE = String(
    window.tentenGlobal && window.tentenGlobal.interfaceLanguage
        ? window.tentenGlobal.interfaceLanguage
        : 'ko'
);
const TENTEN_DB_NAME = `tenTenQuizGlobalDB_${TENTEN_INTERFACE_LANGUAGE_CODE}_to_${TENTEN_LEARNING_LANGUAGE_CODE}`;
const TENTEN_DB_VERSION = 3; // v3: 인덱스명 level -> stage로 변경 (아직 배포 전이라 마이그레이션 없이 버전만 올림)
const STORE_WRONG = 'wrongBank';
const STORE_WORDBOOK = 'myWordbook';
const STORE_PROGRESS = 'learningProgress';

let tentenDB = null;

function notifyLearningRecordsChanged() {
    window.dispatchEvent(new CustomEvent('tenten-learning-records-changed'));
}

function openTenTenDB() {
    return new Promise((resolve, reject) => {
        if (tentenDB) { resolve(tentenDB); return; }

        const request = indexedDB.open(TENTEN_DB_NAME, TENTEN_DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_WRONG)) {
                const wrongStore = db.createObjectStore(STORE_WRONG, { keyPath: 'id' });
                wrongStore.createIndex('stage', 'stage', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORE_WORDBOOK)) {
                const wordbookStore = db.createObjectStore(STORE_WORDBOOK, { keyPath: 'id' });
                wordbookStore.createIndex('stage', 'stage', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
                const progressStore = db.createObjectStore(STORE_PROGRESS, { keyPath: 'id' });
                progressStore.createIndex('stage', 'stage', { unique: false });
                progressStore.createIndex('section', 'section', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            tentenDB = event.target.result;
            tentenDB.onversionchange = () => {
                tentenDB.close();
                tentenDB = null;
            };
            resolve(tentenDB);
        };

        request.onerror = (event) => {
            console.error('IndexedDB 열기 실패:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 고유 ID 생성 (스테이지 + 단어 + 뜻 조합)
function makeItemId(stage, hanzi, meaning, contentId = '') {
    const stableContentId = String(contentId || '').trim();
    return stableContentId || `${stage}_${hanzi}_${meaning}`;
}

// ---------- 공통 CRUD ----------
async function dbGetItem(storeName, id) {
    const db = await openTenTenDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

async function dbPutItem(storeName, item) {
    const db = await openTenTenDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(item);
        tx.oncomplete = () => {
            notifyLearningRecordsChanged();
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
}

async function dbDeleteItem(storeName, id) {
    const db = await openTenTenDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => {
            notifyLearningRecordsChanged();
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
}

async function dbGetAllByStage(storeName, stage) {
    const db = await openTenTenDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const index = tx.objectStore(storeName).index('stage');
        const req = index.getAll(Number(stage));
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function dbGetAll(storeName) {
    const db = await openTenTenDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

// ---------- 오답 클리어하기 전용 ----------
async function addOrUpdateWrong(item) {
    const id = makeItemId(item.stage, item.hanzi, item.meaning, item.id);
    const existing = await dbGetItem(STORE_WRONG, id);

    if (existing) {
        await dbPutItem(STORE_WRONG, {
            ...existing,
            ...item,
            id,
            correctStreak: 0,
            totalWrongCount: (existing.totalWrongCount || 1) + 1,
            lastWrongAt: Date.now()
        });
    } else {
        await dbPutItem(STORE_WRONG, {
            ...item,
            id,
            correctStreak: 0,
            totalWrongCount: 1,
            lastWrongAt: Date.now()
        });
    }
}

// 오답 클리어하기에서 정답 처리 → 즉시 삭제(클리어)
// 반환값: { cleared: boolean, streak: number } or null(은행에 없던 단어)
async function handleCorrectForWrongBank(stage, hanzi, meaning, contentId = '') {
    const id = makeItemId(stage, hanzi, meaning, contentId);
    const existing = await dbGetItem(STORE_WRONG, id);
    if (!existing) return null;

    await dbDeleteItem(STORE_WRONG, id);
    return { cleared: true, streak: 1 };
}

async function getWrongBankCountByStage(stage) {
    const list = await dbGetAllByStage(STORE_WRONG, stage);
    return list.length;
}

// ---------- 내 단어장 전용 ----------
async function addToWordbook(item) {
    const id = makeItemId(item.stage, item.hanzi, item.meaning, item.id);
    const existing = await dbGetItem(STORE_WORDBOOK, id);
    if (existing) return false; // 이미 있음

    await dbPutItem(STORE_WORDBOOK, {
        ...item,
        id,
        savedAt: Date.now()
    });
    return true;
}

async function removeFromWordbookDB(stage, hanzi, meaning, contentId = '') {
    const id = makeItemId(stage, hanzi, meaning, contentId);
    await dbDeleteItem(STORE_WORDBOOK, id);
}

async function getWordbookCountByStage(stage) {
    const list = await dbGetAllByStage(STORE_WORDBOOK, stage);
    return list.length;
}

async function isInWordbook(stage, hanzi, meaning, contentId = '') {
    const id = makeItemId(stage, hanzi, meaning, contentId);
    const existing = await dbGetItem(STORE_WORDBOOK, id);
    return !!existing;
}

// ---------- 스테이지/섹션별 학습 진행 기록 ----------
function makeProgressId(item) {
    if (item && item.id) {
        return `${TENTEN_INTERFACE_LANGUAGE_CODE}_to_${TENTEN_LEARNING_LANGUAGE_CODE}_${String(item.id)}`;
    }

    const stage = Number(item && item.stage) || 1;
    const section = String((item && (item.category || item.section)) || 'unknown');
    const reading = String((item && (item.reading || item.hanzi || item.word)) || '');
    const meaning = String((item && item.meaning) || '');
    return `${stage}_${section}_${reading}_${meaning}`;
}

async function markQuestionLearned(item) {
    if (!item) return false;

    const stage = Number(item.stage) || 1;
    const section = String(item.category || item.section || '');
    if (!section) return false;

    const id = makeProgressId(item);
    const existing = await dbGetItem(STORE_PROGRESS, id);
    if (existing) return false;

    await dbPutItem(STORE_PROGRESS, {
        id,
        stage,
        section,
        learnedAt: Date.now()
    });
    return true;
}

async function getLearningProgressByStage(stage) {
    return dbGetAllByStage(STORE_PROGRESS, stage);
}
