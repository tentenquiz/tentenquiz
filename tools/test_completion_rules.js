// 완료 규칙(2026 개정) 회귀 테스트
//   실행: node tools/test_completion_rules.js
//
// 검증 범위
//   · 일반 섹션 : 25개 학습 + "시작 시점에 이미 전부 학습된" 게임에서 10/10 3회 연속
//   · 오늘의 퀴즈 : 12개 학습 + 같은 방식의 3회 연속 (session.games[] 파생 계산)
//   · 스테이지   : 소속 섹션이 모두 완료
//   · 레거시     : 규칙 변경 시각 이전에 학습을 마친 섹션/스테이지는 완료 유지(M4)
//   · 백업       : sectionPerfect 왕복 보존 / 구버전 백업 호환 / 병합
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
    if (condition) {
        passed += 1;
        console.log(`PASS  ${name}`);
    } else {
        failures.push(`${name}${detail ? ' — ' + detail : ''}`);
        console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
    }
}

function makeStorage() {
    const store = new Map();
    return {
        store,
        api: {
            get length() { return store.size; },
            key: (i) => Array.from(store.keys())[i],
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k)
        }
    };
}

// ── script.js 를 vm 에 올립니다 (DOM 은 전부 no-op 스텁) ──────────────
function loadApp() {
    const storage = makeStorage();
    const noopElement = () => ({
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        style: {}, dataset: {}, hidden: true, textContent: '',
        setAttribute() {}, removeAttribute() {}, appendChild() {}, addEventListener() {},
        querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({}),
        getClientRects: () => []
    });
    const win = {
        console,
        localStorage: storage.api,
        tentenGlobal: { interfaceLanguage: 'ko', learningLanguage: 'ja' },
        addEventListener() {}, dispatchEvent() { return true; },
        setTimeout, clearTimeout, setInterval, clearInterval,
        requestAnimationFrame: () => 0, cancelAnimationFrame() {},
        matchMedia: () => ({ matches: false, addEventListener() {} }),
        navigator: { userAgent: 'node', onLine: true, maxTouchPoints: 0 },
        screen: { width: 1280, height: 800 },
        location: { href: 'https://tentenquiz.example/', search: '', pathname: '/' },
        history: { replaceState() {}, pushState() {} },
        Intl, URL, URLSearchParams,
        CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
        Audio: function Audio() { return { play: () => Promise.resolve() }; },
        document: {
            readyState: 'loading', visibilityState: 'visible',
            addEventListener() {}, getElementById: () => null,
            querySelector: () => null, querySelectorAll: () => [],
            createElement: noopElement, body: noopElement()
        }
    };
    win.window = win; win.globalThis = win; win.self = win;
    vm.createContext(win);
    vm.runInContext(fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8'), win);
    return { win, storage };
}

const RULE_CHANGE_AT = Date.UTC(2026, 8, 1); // 테스트 전용 기준 시각
const BEFORE = RULE_CHANGE_AT - 86400000;
const AFTER = RULE_CHANGE_AT + 86400000;

function words(count, prefix = 'w') {
    return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i}`, stage: 3, category: 'nature_weather' }));
}
function learnedMap(items, timestamp) {
    return new Map(items.map((item) => [item.id, timestamp]));
}
function snapshot(overrides = {}) {
    return Object.assign({
        stage: 3, section: 'nature_weather', totalWords: 25, remainingWords: 0,
        eligible: true, legacyCompleted: false, masteredAt: 0
    }, overrides);
}
function streakOf(win, stage = 3, section = 'nature_weather') {
    return win.getSectionPerfectEntry(win.readSectionPerfectStore(), stage, section);
}

// =====================================================================
console.log('\n[일반 섹션]');
// =====================================================================
{
    const { win } = loadApp();
    const out = win.applySectionPerfectResult(snapshot({ eligible: false, remainingWords: 25 }), 10, 10);
    check('A. 25개 미노출 + 10/10 → streak 증가 없음',
        out.state === 'notEligible' && streakOf(win).perfectStreak === 0, JSON.stringify(out));
}
{
    // 게임 시작 시 24/25 였고 25번째를 게임 도중 학습 → 스냅샷은 eligible:false
    const { win } = loadApp();
    const out = win.applySectionPerfectResult(snapshot({ eligible: false, remainingWords: 1 }), 10, 10);
    check('B. 시작 시 24/25 · 게임 중 25번째 학습 · 10/10 → 인정 안 함',
        out.state === 'notEligible' && streakOf(win).perfectStreak === 0, JSON.stringify(out));
}
{
    const { win } = loadApp();
    const c = win.applySectionPerfectResult(snapshot(), 10, 10);
    check('C. 자격 있는 게임 10/10 → 1/3', c.state === 'progress' && c.streak === 1 && streakOf(win).perfectStreak === 1);
    const d = win.applySectionPerfectResult(snapshot(), 10, 10);
    check('D. 다음 10/10 → 2/3', d.state === 'progress' && d.streak === 2 && streakOf(win).perfectStreak === 2);
    const e = win.applySectionPerfectResult(snapshot(), 10, 10);
    check('E. 다음 10/10 → 3/3 + 완료', e.state === 'mastered' && streakOf(win).masteredAt > 0);

    // K. 완료 후 실패해도 완료 유지 (irreversible)
    const before = streakOf(win).masteredAt;
    const k = win.applySectionPerfectResult(snapshot({ masteredAt: before }), 9, 10);
    check('K. 완료 후 9/10 → 완료 유지 · 갱신 중단',
        k.state === 'locked' && streakOf(win).masteredAt === before && streakOf(win).perfectStreak === 3);
}
{
    const { win } = loadApp();
    win.applySectionPerfectResult(snapshot(), 10, 10);
    const f = win.applySectionPerfectResult(snapshot(), 9, 10);
    check('F. 1/3 상태에서 9/10 → 0/3', f.state === 'reset' && streakOf(win).perfectStreak === 0);
}
{
    const { win } = loadApp();
    win.applySectionPerfectResult(snapshot(), 10, 10);
    win.applySectionPerfectResult(snapshot(), 10, 10);
    // 타임아웃은 점수가 오르지 않으므로 8/10 로 끝난 게임과 동일합니다.
    const g = win.applySectionPerfectResult(snapshot(), 8, 10);
    check('G. 2/3 상태에서 타임아웃 포함 실패 → 0/3', g.state === 'reset' && streakOf(win).perfectStreak === 0);
}
{
    const { win } = loadApp();
    win.applySectionPerfectResult(snapshot(), 10, 10);
    // 중도 종료: 결과 화면에 도달하지 않으므로 applySectionPerfectResult 자체가 호출되지 않습니다.
    check('H. 게임 중도 종료 → streak 유지', streakOf(win).perfectStreak === 1);
}
{
    const { win } = loadApp();
    win.applySectionPerfectResult(snapshot(), 10, 10);
    win.applySectionPerfectResult(snapshot({ section: 'food_drink' }), 9, 10);
    check('I. 다른 섹션 플레이 → 원래 섹션 streak 유지', streakOf(win).perfectStreak === 1);
    win.applySectionPerfectResult(snapshot({ stage: 4 }), 9, 10);
    check('J. 다른 Stage 플레이 → 원래 섹션 streak 유지', streakOf(win).perfectStreak === 1);
}
{
    const { win, storage } = loadApp();
    win.applySectionPerfectResult(snapshot(), 10, 10);
    win.applySectionPerfectResult(snapshot(), 10, 10);
    const raw = storage.store.get('tenten.sectionPerfect.v1.ko.to.ja');
    // 새로고침 = 저장된 값을 다시 읽는 것
    const reread = win.getSectionPerfectEntry(win.readSectionPerfectStore(), 3, 'nature_weather');
    check('L. 새로고침 → streak 유지(localStorage 왕복)', Boolean(raw) && reread.perfectStreak === 2);
}
{
    const { win, storage } = loadApp();
    storage.store.set('tenten.sectionPerfect.v1.ko.to.ja', '{"sections":{"3::nature_weather":{"perfectStreak":"9999","masteredAt":-5},"bad-key":{}},');
    let threw = false; let entry = null;
    try { entry = win.getSectionPerfectEntry(win.readSectionPerfectStore(), 3, 'nature_weather'); }
    catch (error) { threw = true; }
    check('M-1. 깨진 JSON → 예외 없이 기본값', !threw && entry && entry.perfectStreak === 0 && entry.masteredAt === 0);

    storage.store.set('tenten.sectionPerfect.v1.ko.to.ja', JSON.stringify({
        sections: { '3::nature_weather': { perfectStreak: 9999, masteredAt: -5, bestPerfectStreak: 'x' }, 'bad-key': { perfectStreak: 2 } }
    }));
    const clamped = win.getSectionPerfectEntry(win.readSectionPerfectStore(), 3, 'nature_weather');
    const ignored = win.readSectionPerfectStore().sections['bad-key'];
    check('M-2. 범위 밖 값 클램프 + 잘못된 키 무시',
        clamped.perfectStreak === 3 && clamped.masteredAt === 0 && ignored === undefined,
        JSON.stringify(clamped));
}
{
    const { win } = loadApp();
    win.__TENTEN_COMPLETION_RULE_CHANGE_AT__ = RULE_CHANGE_AT;
    const items = words(25);
    const legacy = win.isSectionCompleted(items, learnedMap(items, BEFORE), win.readSectionPerfectStore(), 3, 'nature_weather');
    check('N. 규칙 변경 전 25개 학습 완료 섹션 → 완료 유지(legacy)', legacy === true);

    const mixed = learnedMap(items, BEFORE);
    mixed.set('w24', AFTER);
    const notLegacy = win.isSectionCompleted(items, mixed, win.readSectionPerfectStore(), 3, 'nature_weather');
    check('O. 규칙 변경 시점에 미완료였던 섹션 → 새 규칙 적용', notLegacy === false);

    const partial = learnedMap(items.slice(0, 24), BEFORE);
    check('O-2. 24/25 만 학습 → legacy 아님',
        win.isSectionCompleted(items, partial, win.readSectionPerfectStore(), 3, 'nature_weather') === false);

    // learnedAt 이 없는 레거시 레코드는 진도를 지키는 방향(규칙 변경 이전)으로 처리합니다.
    const missing = new Map(items.map((item) => [item.id, undefined]));
    check('O-3. learnedAt 누락 레코드 → 보수적으로 legacy 인정(진도 보호)',
        win.isSectionCompleted(items, missing, win.readSectionPerfectStore(), 3, 'nature_weather') === true);
    // 레코드 자체가 없으면 미학습이므로 완료가 아닙니다(위조 방지).
    check('O-4. 레코드 없는 단어가 있으면 절대 완료 아님',
        win.isSectionCompleted(items, new Map(), win.readSectionPerfectStore(), 3, 'nature_weather') === false);
}

// =====================================================================
console.log('\n[오늘의 퀴즈]');
// =====================================================================
function game(score, exposed) {
    return { questionKeys: [], score, allWordsExposedAtStart: exposed, completedAt: Date.now() };
}
{
    const { win } = loadApp();
    check('A. 12개 미노출 상태의 게임들 → 숙달 streak 0',
        win.getDailyPerfectStreak({ games: [game(10, false), game(10, false)] }) === 0);
    check('B. 시작 시 11/12 · 게임 중 12번째 학습 · 10/10 → 인정 안 함',
        win.getDailyPerfectStreak({ games: [game(10, false)] }) === 0);
    check('C. 자격 있는 10/10 → 1', win.getDailyPerfectStreak({ games: [game(10, false), game(10, true)] }) === 1);
    check('D. 연속 2회 → 2', win.getDailyPerfectStreak({ games: [game(10, true), game(10, true)] }) === 2);
    check('E. 연속 3회 → 3', win.getDailyPerfectStreak({ games: [game(10, true), game(10, true), game(10, true)] }) === 3);
    check('F. 10 → 10 → 9 → 0', win.getDailyPerfectStreak({ games: [game(10, true), game(10, true), game(9, true)] }) === 0);
    check('F-2. 4연속이어도 상한 3', win.getDailyPerfectStreak({ games: [game(10, true), game(10, true), game(10, true), game(10, true)] }) === 3);
    check('J. 세션이 없으면(날짜 변경) 0', win.getDailyPerfectStreak(null) === 0);
}
{
    // G. 기존 규칙(퍼펙트 1회)으로 이미 cleared 된 오늘 세션이 무효 처리되면 안 됩니다.
    const { win, storage } = loadApp();
    const keys = Array.from({ length: 12 }, (_, i) => `k${i}`);
    const wordStats = Object.fromEntries(keys.map((k) => [k, { exposureCount: 1, correctCount: 1, wrongCount: 0, timeoutCount: 0, needsReview: false }]));
    const gameKeys = keys.slice(0, 10);
    const session = {
        version: 2,
        dateKey: win.getDailyQuizDateKey(),
        dailyWordKeys: keys,
        wordStats,
        games: [{ questionKeys: gameKeys, score: 10, allWordsExposedAtStart: true, completedAt: Date.now() }],
        currentGame: {
            gameNumber: 1, questionKeys: gameKeys, shownQuestionKeys: gameKeys,
            results: gameKeys.map((k) => ({ questionKey: k, status: 'correct' })),
            allWordsExposedAtStart: true, completed: true, startedAt: Date.now()
        },
        all12Exposed: true, perfectGame: true, cleared: true, attempts: 1, lastScore: 10, createdAt: Date.now()
    };
    storage.store.set('tenten.dailyQuiz.v1.ko.to.ja', JSON.stringify(session));
    const restored = win.readDailyQuizSession();
    check('G. 옛 규칙으로 이미 완료한 오늘 세션 → null 되지 않고 완료 유지',
        Boolean(restored) && restored.cleared === true, restored ? '' : 'null 반환됨');
    check('K. 새로고침 → session.games 기반으로 streak 재현',
        Boolean(restored) && win.getDailyPerfectStreak(restored) === 1);
}
{
    // H/I. 3연속을 채운 순간에만 완료 처리되고 그때만 일 단위 기록이 올라갑니다.
    // ※ activeDailyQuizSession 이 모듈 내부에 캐시되므로 시나리오마다 앱을 새로 올립니다.
    const keys = Array.from({ length: 12 }, (_, i) => `k${i}`);
    const wordStats = Object.fromEntries(keys.map((k) => [k, { exposureCount: 1, correctCount: 1, wrongCount: 0, timeoutCount: 0, needsReview: false }]));
    const gameKeys = keys.slice(0, 10);
    const makeSession = (win, finishedPerfectGames) => ({
        version: 2,
        dateKey: win.getDailyQuizDateKey(),
        dailyWordKeys: keys,
        wordStats,
        games: Array.from({ length: finishedPerfectGames }, () => ({
            questionKeys: gameKeys, score: 10, allWordsExposedAtStart: true, completedAt: Date.now()
        })),
        currentGame: {
            gameNumber: finishedPerfectGames + 1, questionKeys: gameKeys, shownQuestionKeys: gameKeys,
            results: gameKeys.map((k) => ({ questionKey: k, status: 'correct' })),
            allWordsExposedAtStart: true, completed: false, startedAt: Date.now()
        },
        all12Exposed: true, perfectGame: finishedPerfectGames > 0, cleared: false,
        attempts: finishedPerfectGames, lastScore: 10, createdAt: Date.now()
    });
    const achievementKey = 'tenten.dailyQuizAchievement.v1.ko.to.ja';
    const SESSION_KEY = 'tenten.dailyQuiz.v1.ko.to.ja';

    function runFinish(finishedPerfectGames) {
        const app = loadApp();
        app.win.selectedQuizSection = 'daily_quiz';
        app.storage.store.set(SESSION_KEY, JSON.stringify(makeSession(app.win, finishedPerfectGames)));
        app.win.completeDailyQuizAttempt(10);
        return {
            session: JSON.parse(app.storage.store.get(SESSION_KEY)),
            hasAchievement: app.storage.store.has(achievementKey),
            achievement: app.storage.store.has(achievementKey)
                ? JSON.parse(app.storage.store.get(achievementKey)) : null
        };
    }

    const two = runFinish(1);
    check('I. 2/3 에서는 완료되지 않고 일 단위 기록도 오르지 않음',
        two.session.games.length === 2 && two.session.cleared !== true && !two.hasAchievement,
        `games=${two.session.games.length} cleared=${two.session.cleared}`);

    const three = runFinish(2);
    check('E-2. 3연속 달성 시 오늘의 퀴즈 완료',
        three.session.games.length === 3 && three.session.cleared === true,
        `games=${three.session.games.length} cleared=${three.session.cleared}`);
    check('H. 완료된 순간에만 일 단위 기록(currentStreak) 증가',
        three.hasAchievement && three.achievement.currentStreak === 1);
}

// =====================================================================
console.log('\n[스테이지]');
// =====================================================================
{
    const { win } = loadApp();
    win.__TENTEN_COMPLETION_RULE_CHANGE_AT__ = RULE_CHANGE_AT;
    const sectionKeys = Array.from({ length: 10 }, (_, i) => `sec${i}`);
    const sectionsWithQuestions = sectionKeys.map((key) => ({ key, questions: words(25, `${key}_`) }));
    const stageQuestions = sectionsWithQuestions.flatMap((entry) => entry.questions);

    // 250개 중 일부 미학습 → 미완료
    const partial = learnedMap(stageQuestions.slice(0, 200), AFTER);
    check('1. 단어 250개 미완료 → 스테이지 미완료',
        win.isStageCompleted(stageQuestions, sectionsWithQuestions, partial, win.readSectionPerfectStore(), 3) === false);

    // 250개 모두 학습했지만 규칙 변경 이후 → 섹션 완료 0/10 → 미완료
    const allAfter = learnedMap(stageQuestions, AFTER);
    check('2. 250개 학습 + 섹션 완료 0/10 → 스테이지 미완료',
        win.isStageCompleted(stageQuestions, sectionsWithQuestions, allAfter, win.readSectionPerfectStore(), 3) === false);

    // 9개 섹션만 완료
    const store = win.readSectionPerfectStore();
    sectionKeys.slice(0, 9).forEach((key) => {
        store.sections[win.makeSectionPerfectKey(3, key)] = { perfectStreak: 3, bestPerfectStreak: 3, masteredAt: Date.now(), lastGameAt: Date.now() };
    });
    win.saveSectionPerfectStore(store);
    const store9 = win.readSectionPerfectStore();
    check('3. 9/10 섹션 완료 → 스테이지 미완료',
        win.countCompletedSections(sectionsWithQuestions, allAfter, store9, 3) === 9
        && win.isStageCompleted(stageQuestions, sectionsWithQuestions, allAfter, store9, 3) === false);

    // 10개 모두 완료
    const store10 = win.readSectionPerfectStore();
    store10.sections[win.makeSectionPerfectKey(3, 'sec9')] = { perfectStreak: 3, bestPerfectStreak: 3, masteredAt: Date.now(), lastGameAt: Date.now() };
    win.saveSectionPerfectStore(store10);
    const finalStore = win.readSectionPerfectStore();
    check('4. 10/10 섹션 완료 → 스테이지 완료',
        win.isStageCompleted(stageQuestions, sectionsWithQuestions, allAfter, finalStore, 3) === true);

    // legacy 스테이지
    const allBefore = learnedMap(stageQuestions, BEFORE);
    const emptyStore = win.normalizeSectionPerfectStore(null, 'ko', 'ja');
    check('5. 규칙 변경 전 250개 학습 완료 → legacy 스테이지 완료 유지',
        win.isStageCompleted(stageQuestions, sectionsWithQuestions, allBefore, emptyStore, 3) === true);

    // 완료 후에는 섹션 완료가 되돌아가지 않으므로 스테이지도 유지됩니다.
    check('6. 스테이지 완료 후 섹션 추가 플레이 실패 → 완료 유지',
        win.isStageCompleted(stageQuestions, sectionsWithQuestions, allAfter, finalStore, 3) === true);
}

// =====================================================================
console.log('\n[클라우드 백업 / 복구]');
// =====================================================================
function loadRecords(initial = {}) {
    const storage = makeStorage();
    Object.entries(initial).forEach(([k, v]) => storage.store.set(k, JSON.stringify(v)));
    const win = {
        localStorage: storage.api,
        indexedDB: {},
        TENTEN_LANGUAGES: [{ code: 'ko' }, { code: 'ja' }, { code: 'en' }],
        tentenGlobal: { interfaceLanguage: 'ko', learningLanguage: 'ja' },
        document: { readyState: 'complete', getElementById: () => null, addEventListener() {} },
        dispatchEvent() {}, addEventListener() {}, console
    };
    win.window = win;
    vm.createContext(win);
    vm.runInContext(fs.readFileSync(path.join(projectRoot, 'learning-records.js'), 'utf8'), win);
    return { win, storage, api: win.TentenLearningRecords };
}

const SECTION_KEY = 'tenten.sectionPerfect.v1.ko.to.ja';
function perfectStore(sections) {
    return { version: 1, nativeLanguage: 'ko', learningLanguage: 'ja', sections };
}
function basePayload(extra = {}) {
    return Object.assign({
        format: 'tentenquiz-learning-records',
        version: 1,
        exportedAt: new Date().toISOString(),
        preferences: { interfaceLanguage: 'ko', learningLanguage: 'ja', chineseReading: 'pinyin' },
        dailyQuizAchievements: [],
        databases: []
    }, extra);
}
{
    const src = loadRecords({ [SECTION_KEY]: perfectStore({ '3::nature_weather': { perfectStreak: 2, bestPerfectStreak: 2, masteredAt: 0, lastGameAt: 111 } }) });
    const collected = src.api.collectSectionPerfectStores();
    check('1. 백업 수집에 섹션 퍼펙트 기록 포함',
        collected.length === 1 && collected[0].sections['3::nature_weather'].perfectStreak === 2);

    const validated = src.api.validateBackupPayload(basePayload({ sectionPerfect: collected }));
    check('2. 검증 결과 객체에 sectionPerfect 가 살아 있음 (재조립 누락 방지)',
        Array.isArray(validated.sectionPerfect) && validated.sectionPerfect.length === 1);
    check('3. BACKUP_VERSION 은 1 유지', validated.version === 1);

    const dst = loadRecords();
    dst.api.restoreSectionPerfectStores(validated.sectionPerfect);
    const restored = JSON.parse(dst.storage.store.get(SECTION_KEY));
    check('4. 다른 환경에 복구 → 2/3 유지', restored.sections['3::nature_weather'].perfectStreak === 2);
}
{
    const src = loadRecords({ [SECTION_KEY]: perfectStore({ '5::food_drink': { perfectStreak: 3, bestPerfectStreak: 3, masteredAt: 1700000000000, lastGameAt: 1700000000000 } }) });
    const validated = src.api.validateBackupPayload(basePayload({ sectionPerfect: src.api.collectSectionPerfectStores() }));
    const dst = loadRecords();
    dst.api.restoreSectionPerfectStores(validated.sectionPerfect);
    const restored = JSON.parse(dst.storage.store.get(SECTION_KEY));
    check('5. 완료(mastered) 섹션 백업 → 복구 후 완료 유지',
        restored.sections['5::food_drink'].masteredAt === 1700000000000
        && restored.sections['5::food_drink'].perfectStreak === 3);
}
{
    const src = loadRecords();
    let ok = true; let error = '';
    try {
        const validated = src.api.validateBackupPayload(basePayload()); // sectionPerfect 필드 자체가 없음
        ok = Array.isArray(validated.sectionPerfect) && validated.sectionPerfect.length === 0;
    } catch (e) { ok = false; error = e.message; }
    check('6. 구버전 백업(새 필드 없음) → 정상 복원', ok, error);
}
{
    const src = loadRecords();
    const malformed = [{ nativeLanguage: 'ko', learningLanguage: 'ja', sections: { '3::a': { perfectStreak: 99, masteredAt: 'x' }, 'nope': { perfectStreak: 3 } } }];
    let entry = null; let threw = false;
    try { entry = src.api.validateBackupPayload(basePayload({ sectionPerfect: malformed })).sectionPerfect[0]; }
    catch (e) { threw = true; }
    check('7. malformed 필드 → 예외 없이 정규화(클램프 + 잘못된 키 제거)',
        !threw && entry && entry.sections['3::a'].perfectStreak === 3
        && entry.sections['3::a'].masteredAt === 0 && entry.sections['nope'] === undefined);
}
{
    // 병합: 한쪽 기기 완료 + 다른 쪽 1/3 → 완료 우선(OR 병합)
    const dst = loadRecords({ [SECTION_KEY]: perfectStore({ '3::nature_weather': { perfectStreak: 1, bestPerfectStreak: 1, masteredAt: 0, lastGameAt: 10 } }) });
    dst.api.restoreSectionPerfectStores([perfectStore({ '3::nature_weather': { perfectStreak: 3, bestPerfectStreak: 3, masteredAt: 1699999999999, lastGameAt: 20 } })]);
    const merged = JSON.parse(dst.storage.store.get(SECTION_KEY)).sections['3::nature_weather'];
    check('8. 병합: 한쪽이 완료면 완료 유지', merged.masteredAt === 1699999999999 && merged.perfectStreak === 3);

    const dst2 = loadRecords({ [SECTION_KEY]: perfectStore({ '3::nature_weather': { perfectStreak: 2, bestPerfectStreak: 2, masteredAt: 0, lastGameAt: 10 } }) });
    dst2.api.restoreSectionPerfectStores([perfectStore({ '3::nature_weather': { perfectStreak: 1, bestPerfectStreak: 1, masteredAt: 0, lastGameAt: 5 } })]);
    const merged2 = JSON.parse(dst2.storage.store.get(SECTION_KEY)).sections['3::nature_weather'];
    check('9. 병합: 2/3 vs 1/3 → 2/3 (합산하지 않음)', merged2.perfectStreak === 2);
}

// =====================================================================
console.log('\n[production cutoff — 실제 상수로 검증]');
// 여기서는 __TENTEN_COMPLETION_RULE_CHANGE_AT__ 오버라이드를 쓰지 않고
// script.js 에 박힌 production 값을 그대로 사용합니다.
// =====================================================================
const EXPECTED_CUTOFF = Date.UTC(2026, 8, 4, 0, 0, 0); // 2026-09-04T00:00:00Z
{
    const { win } = loadApp();
    const cutoff = win.getCompletionRuleChangeAt();
    check('P0-1. production cutoff 값이 확정값과 일치',
        cutoff === EXPECTED_CUTOFF, `실제=${cutoff} (${new Date(cutoff).toISOString()})`);
    check('P0-2. Infinity / 비유한값이 아님', Number.isFinite(cutoff));
    check('P0-3. cutoff 가 과거가 아님(배포 전 시각)', cutoff > Date.now(),
        `now=${new Date().toISOString()} cutoff=${new Date(cutoff).toISOString()}`);

    const before = cutoff - 3600000;   // 기준시각 1시간 전
    const after = cutoff + 3600000;    // 기준시각 1시간 후
    const items = words(25);
    const emptyStore = win.readSectionPerfectStore();

    // A. 25개 모두 기준시각 이전 → legacy 완료
    check('A. 25개 모두 learnedAt < 기준시각 → legacy 완료',
        win.isSectionCompleted(items, learnedMap(items, before), emptyStore, 3, 'nature_weather') === true);

    // B. 24개만 존재 → legacy 아님
    check('B. 24개만 학습 → legacy 완료 아님',
        win.isSectionCompleted(items, learnedMap(items.slice(0, 24), before), emptyStore, 3, 'nature_weather') === false);

    // C. 마지막 하나가 기준시각 이후 → legacy 아님
    const late = learnedMap(items, before);
    late.set('w24', after);
    check('C. 25개 중 마지막 learnedAt > 기준시각 → legacy 완료 아님',
        win.isSectionCompleted(items, late, emptyStore, 3, 'nature_weather') === false);

    // D. 기준시각 이전 완료 → 퍼펙트 기록이 0이어도 완료가 박탈되지 않음
    const zeroStreak = win.getSectionPerfectEntry(emptyStore, 3, 'nature_weather');
    check('D. 기준시각 이전 완료 섹션 → 새 규칙으로 완료 박탈되지 않음',
        zeroStreak.perfectStreak === 0 && zeroStreak.masteredAt === 0
        && win.isSectionCompleted(items, learnedMap(items, before), emptyStore, 3, 'nature_weather') === true);

    // E. 기준시각 당시 미완료 → 이후 25개를 다 채워도 새 규칙(3연속) 적용
    const afterAll = learnedMap(items, after);
    check('E-1. 기준시각 이후 25개 완성 → legacy 아님(새 규칙 적용)',
        win.isSectionCompleted(items, afterAll, emptyStore, 3, 'nature_weather') === false);
    const store = win.readSectionPerfectStore();
    const snap = { stage: 3, section: 'nature_weather', totalWords: 25, remainingWords: 0,
                   eligible: true, legacyCompleted: false, masteredAt: 0 };
    win.applySectionPerfectResult(snap, 10, 10);
    win.applySectionPerfectResult(snap, 10, 10);
    const twoOfThree = win.readSectionPerfectStore();
    check('E-2. 퍼펙트 2/3 까지는 아직 미완료',
        win.isSectionCompleted(items, afterAll, twoOfThree, 3, 'nature_weather') === false);
    win.applySectionPerfectResult(snap, 10, 10);
    const done = win.readSectionPerfectStore();
    check('E-3. 퍼펙트 3/3 달성 → 완료',
        win.isSectionCompleted(items, afterAll, done, 3, 'nature_weather') === true);

    // F / G. 스테이지
    const app2 = loadApp();
    const sectionKeys = Array.from({ length: 10 }, (_, i) => `sec${i}`);
    const sectionsWithQuestions = sectionKeys.map((key) => ({ key, questions: words(25, `${key}_`) }));
    const stageQuestions = sectionsWithQuestions.flatMap((entry) => entry.questions);
    const emptyStore2 = app2.win.readSectionPerfectStore();
    check('F. 기준시각 이전에 250개를 모두 학습한 Stage → 완료 유지',
        app2.win.isStageCompleted(stageQuestions, sectionsWithQuestions, learnedMap(stageQuestions, before), emptyStore2, 3) === true);

    const stageAfter = learnedMap(stageQuestions, after);
    check('G-1. 기준시각 이후 250개 학습 Stage → 섹션 완료 0/10 이면 미완료',
        app2.win.isStageCompleted(stageQuestions, sectionsWithQuestions, stageAfter, emptyStore2, 3) === false);
    const st = app2.win.readSectionPerfectStore();
    sectionKeys.forEach((key) => {
        st.sections[app2.win.makeSectionPerfectKey(3, key)] =
            { perfectStreak: 3, bestPerfectStreak: 3, masteredAt: Date.now(), lastGameAt: Date.now() };
    });
    app2.win.saveSectionPerfectStore(st);
    check('G-2. 10개 섹션 모두 완료 → Stage 완료',
        app2.win.isStageCompleted(stageQuestions, sectionsWithQuestions, stageAfter, app2.win.readSectionPerfectStore(), 3) === true);
}

// =====================================================================
console.log('');
if (failures.length) {
    console.log(`❌ 실패 ${failures.length}건 / 통과 ${passed}건`);
    failures.forEach((line) => console.log('   - ' + line));
    process.exit(1);
}
console.log(`✅ 전체 통과 (${passed}건)`);
