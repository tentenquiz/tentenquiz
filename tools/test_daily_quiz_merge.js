// 오늘의 퀴즈 연속 기록(Streak) 병합 회귀 테스트
//   실행: node tools/test_daily_quiz_merge.js
//
// 배경: 두 기기의 completedDates 는 합집합으로 병합하면서 currentStreak 은
// "lastClearDate 가 더 최신인 쪽"의 값을 그대로 가져가는 버그가 있었습니다.
// 폰 19일 + 태블릿 1일 을 병합하면 20 이 아니라 1 이 되어 19일치가 사라졌습니다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const store = new Map();
const localStorage = {
    get length() { return store.size; },
    key: (i) => Array.from(store.keys())[i],
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
};

const win = {
    localStorage,
    indexedDB: {},
    TENTEN_LANGUAGES: [{ code: 'ko' }, { code: 'ja' }, { code: 'en' }],
    tentenGlobal: { interfaceLanguage: 'ko', learningLanguage: 'ja' },
    document: { readyState: 'complete', getElementById: () => null, addEventListener: () => {} },
    dispatchEvent: () => {},
    addEventListener: () => {},
    console
};
win.window = win;
vm.createContext(win);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'learning-records.js'), 'utf8'), win);

const API = win.TentenLearningRecords;
const KEY = 'tenten.dailyQuizAchievement.v1.ko.to.ja';

function dates(startOrdinalDate, count) {
    const out = [];
    const base = Date.parse(`${startOrdinalDate}T00:00:00Z`);
    for (let i = 0; i < count; i += 1) out.push(new Date(base + i * 86400000).toISOString().slice(0, 10));
    return out;
}

function run(name, localRec, incomingRec, expectedStreak) {
    store.clear();
    store.set(KEY, JSON.stringify(localRec));
    API.restoreDailyQuizAchievements([incomingRec]);
    const merged = JSON.parse(store.get(KEY));
    const ok = merged.currentStreak === expectedStreak;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
    console.log(`      currentStreak=${merged.currentStreak} (기대 ${expectedStreak}), best=${merged.bestStreak}, total=${merged.totalClearDays}, dates=${merged.completedDates.length}`);
    return ok;
}

const base = (over) => ({
    version: 1, nativeLanguage: 'ko', learningLanguage: 'ja',
    currentStreak: 0, bestStreak: 0, totalClearDays: 0,
    lastClearDate: '', lastCompletedAt: 0, timeZone: 'Asia/Seoul', completedDates: [], ...over
});

let allOk = true;

// 리뷰 문서에 적은 바로 그 시나리오: 폰 19일 + 태블릿 1일 → 20이어야 함
allOk &= run('폰 08-01~08-19(19일) + 태블릿 08-20(1일)',
    base({ completedDates: dates('2026-08-01', 19), lastClearDate: '2026-08-19', currentStreak: 19, bestStreak: 19, totalClearDays: 19 }),
    base({ completedDates: ['2026-08-20'], lastClearDate: '2026-08-20', currentStreak: 1, bestStreak: 1, totalClearDays: 1 }),
    20);

// 중간에 하루 빠진 경우: 끊긴 뒤 구간만 세야 함
allOk &= run('08-01~08-05 + 08-07~08-08 (08-06 결손)',
    base({ completedDates: dates('2026-08-01', 5), lastClearDate: '2026-08-05', currentStreak: 5, bestStreak: 5, totalClearDays: 5 }),
    base({ completedDates: ['2026-08-07', '2026-08-08'], lastClearDate: '2026-08-08', currentStreak: 2, bestStreak: 2, totalClearDays: 2 }),
    2);

// 같은 날짜를 양쪽에서 달성
allOk &= run('양쪽 모두 08-20 하루',
    base({ completedDates: ['2026-08-20'], lastClearDate: '2026-08-20', currentStreak: 1, bestStreak: 3, totalClearDays: 1 }),
    base({ completedDates: ['2026-08-20'], lastClearDate: '2026-08-20', currentStreak: 1, bestStreak: 7, totalClearDays: 1 }),
    1);

// 800일 상한 초과 → 잘림 감지 후 저장값을 하한으로
allOk &= run('연속 900일 (배열 상한 800 초과)',
    base({ completedDates: dates('2024-01-01', 900), lastClearDate: dates('2024-01-01', 900)[899], currentStreak: 900, bestStreak: 900, totalClearDays: 900 }),
    base({ completedDates: [], lastClearDate: '', currentStreak: 0, bestStreak: 0, totalClearDays: 0 }),
    900);

console.log(allOk ? '\n전체 통과' : '\n실패 있음');
process.exit(allOk ? 0 : 1);
