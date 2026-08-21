if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(granted => {
        console.log(granted ? '영구 저장 공간 확보됨' : '영구 저장 요청 거부됨');
    });
}

function uiT(key, values = {}) {
    return typeof window.tentenT === 'function' ? window.tentenT(key, values) : key;
}
// =======================================================
// 텐텐퀴즈 시스템 (10문제 · 문제당 10초)
// =======================================================
let hanziRevealTimer = null;
let celebrationHideTimer = null;
let celebrationLoopTimer = null;
let completionCardCelebrationTimers = [];

function resetCompletionCardCelebrations() {
    completionCardCelebrationTimers.forEach((timer) => {
        clearTimeout(timer);
        clearInterval(timer);
    });
    completionCardCelebrationTimers = [];
}

function startCompletionCardCelebration(button, order = 0) {
    if (!button || typeof confetti !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'progress-complete-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    button.prepend(canvas);

    // 완료된 섹션과 스테이지 카드마다 독립된 로컬 캔버스에 그립니다.
    const burst = confetti.create(canvas, { resize: true, useWorker: false });
    const celebrate = () => {
        if (!button.isConnected || button.getClientRects().length === 0) return;

        const emoji = button.querySelector('.section-emoji');
        if (emoji) {
            emoji.classList.remove('is-celebrating');
            void emoji.offsetWidth;
            emoji.classList.add('is-celebrating');
        }

        burst({
            particleCount: 34,
            spread: 105,
            startVelocity: 7,
            gravity: 0.38,
            scalar: 0.66,
            ticks: 125,
            decay: 0.955,
            origin: { x: 0.5, y: 0.52 },
            disableForReducedMotion: true
        });
    };

    const firstTimer = setTimeout(() => {
        celebrate();
        const loopTimer = setInterval(celebrate, 3000);
        completionCardCelebrationTimers.push(loopTimer);
    }, 350 + order * 500);
    completionCardCelebrationTimers.push(firstTimer);
}

function resetPerfectScoreCelebration() {
    const box = document.getElementById('perfect-score-celebration');

    if (celebrationHideTimer) {
        clearTimeout(celebrationHideTimer);
        celebrationHideTimer = null;
    }

    if (celebrationLoopTimer) {
        clearInterval(celebrationLoopTimer);
        celebrationLoopTimer = null;
    }

    if (typeof confetti === 'function' && typeof confetti.reset === 'function') {
        confetti.reset();
    }

    if (!box) return;

    box.classList.remove('is-visible');
    box.innerHTML = '';
}

function renderPerfectScoreMessage(box, message) {
    box.classList.remove('is-visible');
    box.innerHTML = `
        <img class="perfect-score-emoji" src="assets/ui/perfect-score-100.svg" alt="" aria-hidden="true">
        <div class="perfect-score-message">${message}</div>
    `;

    void box.offsetWidth;
    box.classList.add('is-visible');
}

function launchPerfectScoreConfetti(particleCount) {
    if (typeof confetti !== 'function') return;

    confetti({
        particleCount,
        spread: 90,
        origin: { y: 0.4 },
        disableForReducedMotion: true
    });
}

function showPerfectScoreCelebration(correctCount = score) {
    if (correctCount !== TOTAL_QUESTIONS) {
        resetPerfectScoreCelebration();
        return;
    }

    const box = document.getElementById('perfect-score-celebration');
    if (!box) return;

    const message = uiT('perfectScore');

    renderPerfectScoreMessage(box, message);
    launchPerfectScoreConfetti(150);

    if (celebrationLoopTimer) {
        clearInterval(celebrationLoopTimer);
    }

    celebrationLoopTimer = setInterval(() => {
        const resultCard = document.getElementById('result-card');
        const celebrationBox = document.getElementById('perfect-score-celebration');
        if (!resultCard || !celebrationBox || resultCard.style.display === 'none' || score !== TOTAL_QUESTIONS) {
            resetPerfectScoreCelebration();
            return;
        }

        renderPerfectScoreMessage(celebrationBox, message);
        launchPerfectScoreConfetti(120);
    }, 1800);
}

function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getRegisteredSections() {
    return Array.isArray(window.quizSectionRegistry) ? window.quizSectionRegistry : [];
}

function buildFallbackNote(item, word, meaning) {
    if (item && item.confusablePair) {
        return `헷갈리기 쉬운 표현: ${item.confusablePair}`;
    }

    if (item && String(item.wordType || '').toLowerCase() === 'phrase') {
        return `표현 전체를 통째로 익혀보세요: ${word} = ${meaning}`;
    }

    if (word && meaning) {
        return `핵심 암기: ${word} = ${meaning}`;
    }

    return '뜻과 발음을 함께 반복해 보세요.';
}

function getAvailableStages() {
    const stages = new Set(
        activeQuizData
            .map((item) => Number(item.stage))
            .filter((stage) => Number.isInteger(stage) && stage >= 1 && stage <= 10)
    );

    return Array.from(stages).sort((a, b) => a - b);
}

function getDefaultStageKey() {
    const stages = getAvailableStages();
    return stages.length ? String(stages[0]) : '1';
}

function getDefaultSectionKey() {
    const sections = getRegisteredSections();
    return sections.length ? String(sections[0].key) : '';
}

function getAvailableSectionsByStage(stageKey) {
    const stage = Number(stageKey);
    if (!Number.isInteger(stage)) {
        return getRegisteredSections();
    }

    return getRegisteredSections().filter((section) => {
        const sectionData = Array.isArray(section.data) ? section.data : [];
        return sectionData.some((item) => Number(item.stage) === stage);
    });
}

function bindStaticUiEvents() {
    if (window.__quizUiEventsBound) return;
    window.__quizUiEventsBound = true;

    const bindClick = (selector, handler) => {
        document.querySelectorAll(selector).forEach((element) => {
            element.addEventListener('click', handler);
        });
    };

    bindClick('.js-action-pause-toggle', () => togglePauseMode());
    bindClick('.js-action-back-stage', () => backToStageSelection());
    bindClick('.js-action-repeat-stop', () => stopRepeatMode());
    bindClick('.js-action-sound-toggle', () => toggleSound());
    bindClick('.js-action-quiz-back-section', () => window.selectedQuizSection === VIRTUAL_SECTION_WORDBOOK ? finishWordbookLearning() : goToSameSectionFromQuiz());
    bindClick('.js-action-share-result', () => shareToKakao());
    bindClick('.js-action-daily-quiz', () => startDailyQuiz());
    bindClick('.js-action-restart-stage', () => {
        if (window.selectedQuizSection === VIRTUAL_SECTION_DAILY) resetDailyQuizAttempt();
        restartQuiz();
    });
    bindClick('.js-action-share-notes', () => shareNotesToKakao());
    bindClick('.js-action-result-back-same', () => goToSameSectionFromResult());
    bindClick('.js-action-result-back-all', () => goToAllSectionsFromResult());

    document.querySelectorAll('.js-action-option').forEach((button, idx) => {
        const optionIndex = Number(button.getAttribute('data-option-index'));
        const answerIndex = Number.isInteger(optionIndex) ? optionIndex : idx;
        button.addEventListener('click', () => checkAnswer(answerIndex));
    });

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest('.js-action-accordion-toggle');
        if (button instanceof HTMLButtonElement) toggleAcc(button);
    });

    const resultCard = document.getElementById('result-card');
    if (!resultCard) return;

    resultCard.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const wordSpeakButton = target.closest('.js-action-note-speak-word');
        if (wordSpeakButton instanceof HTMLElement) {
            const hanzi = wordSpeakButton.dataset.hanzi || '';
            const section = wordSpeakButton.dataset.section || '';
            const audioFile = wordSpeakButton.dataset.audioFile || '';
            speakChinese(hanzi, section, audioFile);
            return;
        }

        const exampleSpeakButton = target.closest('.js-action-note-speak-example');
        if (exampleSpeakButton instanceof HTMLElement) {
            const hanzi = exampleSpeakButton.dataset.hanzi || '';
            speakExample(hanzi);
            return;
        }

        const addWordbookButton = target.closest('.js-action-wordbook-add');
        if (addWordbookButton instanceof HTMLButtonElement) {
            addToWordbookAndRefresh(addWordbookButton);
            return;
        }

        const removeWordbookButton = target.closest('.js-action-wordbook-remove');
        if (removeWordbookButton instanceof HTMLButtonElement) {
            removeFromWordbookAndRefresh(removeWordbookButton);
        }
    });
}

// ★ 가상 섹션 메타 정보 (기존 sectionLabelMap과 같은 패턴)
const VIRTUAL_SECTION_WRONG = 'wrong_bank';
const VIRTUAL_SECTION_WORDBOOK = 'my_wordbook';
const VIRTUAL_SECTION_DAILY = 'daily_quiz';
const DAILY_QUIZ_STORAGE_VERSION = 1;
const DAILY_QUIZ_QUESTION_COUNT = 10;
const DAILY_QUIZ_STORAGE_PREFIX = 'tenten.dailyQuiz.v1';
const DAILY_QUIZ_ACHIEVEMENT_VERSION = 1;
const DAILY_QUIZ_ACHIEVEMENT_PREFIX = 'tenten.dailyQuizAchievement.v1';
const DAILY_QUIZ_ACHIEVEMENT_DATE_LIMIT = 800;
let activeDailyQuizSession = null;
let dailyQuizBannerCelebrationTimer = null;
let dailyQuizBannerCelebrationStarter = null;

function getVirtualSectionMeta(key) {
    if (key === VIRTUAL_SECTION_WRONG) return { key, label: uiT('wrongClear'), emoji: '🔥' };
    if (key === VIRTUAL_SECTION_WORDBOOK) return { key, label: uiT('myWordbook'), emoji: '⭐' };
    if (key === VIRTUAL_SECTION_DAILY) return { key, label: uiT('dailyQuizTitle'), emoji: '✨' };
    return null;
}

function getQuestionProgressId(item) {
    return typeof makeProgressId === 'function'
        ? makeProgressId(item)
        : String((item && item.id) || '');
}

function getUniqueSectionQuestions(stageKey, sectionKey) {
    const unique = new Map();
    activeQuizData
        .filter((item) =>
            Number(item.stage) === Number(stageKey) &&
            (item.category === sectionKey || item.section === sectionKey)
        )
        .forEach((item) => {
            const id = getQuestionProgressId(item);
            if (id) unique.set(id, item);
        });
    return Array.from(unique.values());
}

function reconnectStoredQuizItem(item) {
    if (!item) return null;
    const storedSection = String(item.category || item.section || '');
    const storedStage = Number(item.stage);
    const storedHeadwords = new Set(
        [item.hanzi, item.reading, item.pinyin]
            .map((value) => String(value || '').trim().toLocaleLowerCase())
            .filter(Boolean)
    );
    const original = activeQuizData.find((candidate) =>
        (item.id && candidate.id === item.id) ||
        (
            Number(candidate.stage) === storedStage &&
            String(candidate.category || candidate.section || '') === storedSection &&
            [candidate.hanzi, candidate.reading, candidate.pinyin]
                .map((value) => String(value || '').trim().toLocaleLowerCase())
                .some((value) => value && storedHeadwords.has(value))
        )
    );
    if (!original) return item;
    if (typeof window.mergeTentenStoredItem === 'function') {
        return window.mergeTentenStoredItem(item, original);
    }
    return {
        ...item,
        hanzi: original.hanzi || item.hanzi || '',
        reading: original.reading || item.reading || '',
        pinyin: original.pinyin || item.pinyin || '',
        meaning: original.meaning || item.meaning || '',
        note: original.note || item.note || '',
        options: Array.isArray(original.options) ? [...original.options] : item.options,
        correct: Number.isInteger(original.correct) ? original.correct : item.correct,
        audioFile: original.audioFile || '',
        answerAudioFile: original.answerAudioFile || item.answerAudioFile || '',
        category: item.category || original.category || '',
        section: item.section || original.section || '',
        learningLanguage: original.learningLanguage || item.learningLanguage || '',
        interfaceLanguage: original.interfaceLanguage || item.interfaceLanguage || '',
        isGlobalData: Boolean(original.isGlobalData || item.isGlobalData)
    };
}

function getDailyQuizDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDailyQuizStorageKey() {
    const nativeLanguage = String(window.tentenGlobal?.interfaceLanguage || 'ko');
    const learningLanguage = String(window.tentenGlobal?.learningLanguage || 'en');
    return `${DAILY_QUIZ_STORAGE_PREFIX}.${encodeURIComponent(nativeLanguage)}.to.${encodeURIComponent(learningLanguage)}`;
}

function getDailyQuizAchievementStorageKey(nativeLanguage, learningLanguage) {
    const native = String(nativeLanguage || window.tentenGlobal?.interfaceLanguage || 'ko');
    const learning = String(learningLanguage || window.tentenGlobal?.learningLanguage || 'en');
    return `${DAILY_QUIZ_ACHIEVEMENT_PREFIX}.${encodeURIComponent(native)}.to.${encodeURIComponent(learning)}`;
}

function getDailyQuizTimeZone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (_error) {
        return 'UTC';
    }
}

function dailyQuizDateOrdinal(dateKey) {
    const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return NaN;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const time = Date.UTC(year, month - 1, day);
    const date = new Date(time);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return NaN;
    return Math.floor(time / 86400000);
}

function emptyDailyQuizAchievement(nativeLanguage, learningLanguage) {
    return {
        version: DAILY_QUIZ_ACHIEVEMENT_VERSION,
        nativeLanguage: String(nativeLanguage || window.tentenGlobal?.interfaceLanguage || 'ko'),
        learningLanguage: String(learningLanguage || window.tentenGlobal?.learningLanguage || 'en'),
        currentStreak: 0,
        bestStreak: 0,
        totalClearDays: 0,
        lastClearDate: '',
        lastCompletedAt: 0,
        timeZone: getDailyQuizTimeZone(),
        completedDates: []
    };
}

function normalizeDailyQuizAchievement(value, nativeLanguage, learningLanguage) {
    const fallback = emptyDailyQuizAchievement(nativeLanguage, learningLanguage);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
    const completedDates = Array.from(new Set(
        (Array.isArray(value.completedDates) ? value.completedDates : [])
            .map(String)
            .filter((dateKey) => Number.isFinite(dailyQuizDateOrdinal(dateKey)))
    )).sort().slice(-DAILY_QUIZ_ACHIEVEMENT_DATE_LIMIT);
    const lastClearDate = Number.isFinite(dailyQuizDateOrdinal(value.lastClearDate))
        ? String(value.lastClearDate)
        : (completedDates[completedDates.length - 1] || '');
    return {
        version: DAILY_QUIZ_ACHIEVEMENT_VERSION,
        nativeLanguage: fallback.nativeLanguage,
        learningLanguage: fallback.learningLanguage,
        currentStreak: Math.max(0, Math.floor(Number(value.currentStreak) || 0)),
        bestStreak: Math.max(0, Math.floor(Number(value.bestStreak) || 0)),
        totalClearDays: Math.max(completedDates.length, Math.floor(Number(value.totalClearDays) || 0)),
        lastClearDate,
        lastCompletedAt: Math.max(0, Math.floor(Number(value.lastCompletedAt) || 0)),
        timeZone: String(value.timeZone || fallback.timeZone).slice(0, 80),
        completedDates
    };
}

function readDailyQuizAchievement(nativeLanguage, learningLanguage) {
    const key = getDailyQuizAchievementStorageKey(nativeLanguage, learningLanguage);
    try {
        const raw = window.localStorage.getItem(key);
        return normalizeDailyQuizAchievement(raw ? JSON.parse(raw) : null, nativeLanguage, learningLanguage);
    } catch (error) {
        console.warn('오늘의 퀴즈 연속 기록을 읽지 못했습니다:', error);
        return emptyDailyQuizAchievement(nativeLanguage, learningLanguage);
    }
}

function saveDailyQuizAchievement(achievement) {
    const normalized = normalizeDailyQuizAchievement(
        achievement,
        achievement?.nativeLanguage,
        achievement?.learningLanguage
    );
    try {
        window.localStorage.setItem(
            getDailyQuizAchievementStorageKey(normalized.nativeLanguage, normalized.learningLanguage),
            JSON.stringify(normalized)
        );
    } catch (error) {
        console.warn('오늘의 퀴즈 연속 기록을 저장하지 못했습니다:', error);
    }
    return normalized;
}

function calculateDailyQuizAchievement(previousValue, dateKey, completedAt = Date.now(), timeZone = getDailyQuizTimeZone()) {
    const previous = normalizeDailyQuizAchievement(
        previousValue,
        previousValue?.nativeLanguage,
        previousValue?.learningLanguage
    );
    const nextOrdinal = dailyQuizDateOrdinal(dateKey);
    const previousOrdinal = dailyQuizDateOrdinal(previous.lastClearDate);
    if (!Number.isFinite(nextOrdinal)) return { achievement: previous, isNew: false };
    if (previous.completedDates.includes(dateKey) || previous.lastClearDate === dateKey) {
        return { achievement: previous, isNew: false };
    }
    // 기기 날짜를 과거로 돌려 동일 기록을 반복 생성하는 것을 막습니다.
    if (Number.isFinite(previousOrdinal) && nextOrdinal < previousOrdinal) {
        return { achievement: previous, isNew: false };
    }

    const currentStreak = Number.isFinite(previousOrdinal) && nextOrdinal - previousOrdinal === 1
        ? previous.currentStreak + 1
        : 1;
    const completedDates = Array.from(new Set([...previous.completedDates, dateKey]))
        .sort()
        .slice(-DAILY_QUIZ_ACHIEVEMENT_DATE_LIMIT);
    const achievement = {
        ...previous,
        currentStreak,
        bestStreak: Math.max(previous.bestStreak, currentStreak),
        totalClearDays: previous.totalClearDays + 1,
        lastClearDate: dateKey,
        lastCompletedAt: Math.max(Number(completedAt) || Date.now(), previous.lastCompletedAt),
        timeZone: String(timeZone || previous.timeZone || 'UTC').slice(0, 80),
        completedDates
    };
    return { achievement, isNew: true };
}

function recordDailyQuizAchievement(date = new Date(), options = {}) {
    const nativeLanguage = String(window.tentenGlobal?.interfaceLanguage || 'ko');
    const learningLanguage = String(window.tentenGlobal?.learningLanguage || 'en');
    const dateKey = typeof date === 'string' ? date : getDailyQuizDateKey(date);
    const previous = readDailyQuizAchievement(nativeLanguage, learningLanguage);
    const result = calculateDailyQuizAchievement(
        previous,
        dateKey,
        Number(options.completedAt || Date.now()),
        options.timeZone || getDailyQuizTimeZone()
    );
    if (!result.isNew) return result;
    const achievement = saveDailyQuizAchievement(result.achievement);
    if (options.dispatch !== false) {
        window.dispatchEvent(new CustomEvent('tenten-daily-quiz-completed', {
            detail: {
                nativeLanguage,
                learningLanguage,
                dateKey,
                timeZone: achievement.timeZone,
                completedAt: achievement.lastCompletedAt,
                currentStreak: achievement.currentStreak,
                bestStreak: achievement.bestStreak,
                totalClearDays: achievement.totalClearDays,
                questionCount: DAILY_QUIZ_QUESTION_COUNT,
                score: DAILY_QUIZ_QUESTION_COUNT
            }
        }));
    }
    return { achievement, isNew: true };
}

function migrateLegacyDailyQuizAchievement() {
    const current = readDailyQuizAchievement();
    if (current.totalClearDays > 0 || current.lastClearDate) return current;
    try {
        const raw = window.localStorage.getItem(getDailyQuizStorageKey());
        const session = raw ? JSON.parse(raw) : null;
        if (!session?.cleared || !Number.isFinite(dailyQuizDateOrdinal(session.dateKey))) return current;
        return recordDailyQuizAchievement(session.dateKey, {
            completedAt: Number(session.clearedAt || session.attempt?.completedAt || Date.now()),
            dispatch: false
        }).achievement;
    } catch (_error) {
        return current;
    }
}

function getNextDailyQuizStreakTarget(achievement, todayKey = getDailyQuizDateKey()) {
    const todayOrdinal = dailyQuizDateOrdinal(todayKey);
    const previousOrdinal = dailyQuizDateOrdinal(achievement?.lastClearDate);
    return Number.isFinite(previousOrdinal) && todayOrdinal - previousOrdinal === 1
        ? Math.max(1, Number(achievement.currentStreak) + 1)
        : 1;
}

function stopDailyQuizBannerCelebration(button = document.getElementById('daily-quiz-banner')) {
    if (dailyQuizBannerCelebrationStarter) clearTimeout(dailyQuizBannerCelebrationStarter);
    if (dailyQuizBannerCelebrationTimer) clearInterval(dailyQuizBannerCelebrationTimer);
    dailyQuizBannerCelebrationStarter = null;
    dailyQuizBannerCelebrationTimer = null;
    if (button) button.dataset.celebrationMode = '';
}

function startDailyQuizBannerCelebration(button, cleared) {
    if (!button || button.hidden || typeof confetti !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const mode = cleared ? 'cleared' : 'challenge';
    if (button.dataset.celebrationMode === mode && dailyQuizBannerCelebrationTimer) return;
    stopDailyQuizBannerCelebration(button);

    let canvas = button.querySelector('.daily-quiz-confetti');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'daily-quiz-confetti';
        canvas.setAttribute('aria-hidden', 'true');
        button.prepend(canvas);
    }
    const burst = confetti.create(canvas, { resize: true, useWorker: false });
    const celebrate = () => {
        if (
            !button.isConnected
            || button.hidden
            || button.getClientRects().length === 0
            || (window.selectionStep || 'stage') !== 'stage'
        ) {
            stopDailyQuizBannerCelebration(button);
            return;
        }
        const isRtl = document.documentElement.dir === 'rtl';
        burst({
            particleCount: cleared ? 13 : 6,
            spread: cleared ? 68 : 48,
            startVelocity: cleared ? 19 : 14,
            gravity: 0.8,
            scalar: cleared ? 0.68 : 0.52,
            ticks: 100,
            decay: 0.95,
            colors: cleared
                ? ['#FFD83D', '#4BCB7C', '#45B7FF', '#F06AA6']
                : ['#FFD83D', '#45B7FF', '#F06AA6'],
            origin: { x: isRtl ? 0.9 : 0.1, y: 0.55 },
            disableForReducedMotion: true
        });
    };
    button.dataset.celebrationMode = mode;
    dailyQuizBannerCelebrationStarter = setTimeout(() => {
        celebrate();
        dailyQuizBannerCelebrationTimer = setInterval(celebrate, cleared ? 2300 : 3800);
    }, 350);
}

function getDailyQuizQuestionKey(item) {
    const contentId = String(item?.id || '').trim();
    return contentId || getItemUniqueKey(item || {});
}

function findDailyQuizQuestion(questionKey) {
    const key = String(questionKey || '');
    return activeQuizData.find((item) => getDailyQuizQuestionKey(item) === key) || null;
}

function readDailyQuizSession() {
    try {
        const raw = window.localStorage.getItem(getDailyQuizStorageKey());
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (
            !session ||
            session.version !== DAILY_QUIZ_STORAGE_VERSION ||
            session.dateKey !== getDailyQuizDateKey() ||
            !Array.isArray(session.questionKeys) ||
            session.questionKeys.length !== DAILY_QUIZ_QUESTION_COUNT
        ) {
            return null;
        }
        if (!session.attempt || !Array.isArray(session.attempt.results)) {
            session.attempt = { results: [], completed: false, startedAt: Date.now() };
        }
        return session;
    } catch (error) {
        console.warn('오늘의 퀴즈 로컬 기록을 읽지 못했습니다:', error);
        return null;
    }
}

function saveDailyQuizSession(session) {
    if (!session) return;
    activeDailyQuizSession = session;
    try {
        window.localStorage.setItem(getDailyQuizStorageKey(), JSON.stringify(session));
    } catch (error) {
        console.warn('오늘의 퀴즈 로컬 기록을 저장하지 못했습니다:', error);
    }
}

function takeOrderedDailyItems(source, count, usedKeys) {
    const picked = [];
    for (const item of source || []) {
        if (!item) continue;
        const key = getItemUniqueKey(item);
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        picked.push(item);
        if (picked.length >= count) break;
    }
    return picked;
}

async function buildDailyQuizQuestions() {
    let wrongRecords = [];
    let wordbookRecords = [];
    let progressRecords = [];
    try {
        [wrongRecords, wordbookRecords, progressRecords] = await Promise.all([
            dbGetAll(STORE_WRONG),
            dbGetAll(STORE_WORDBOOK),
            dbGetAll(STORE_PROGRESS)
        ]);
    } catch (error) {
        console.warn('오늘의 퀴즈 복습 기록을 불러오지 못해 기본 문제로 구성합니다:', error);
    }

    const wrongPool = wrongRecords
        .slice()
        .sort((first, second) => Number(first.lastWrongAt || 0) - Number(second.lastWrongAt || 0))
        .map(reconnectStoredQuizItem)
        .filter(Boolean);
    const wordbookPool = wordbookRecords
        .slice()
        .sort((first, second) => Number(first.savedAt || 0) - Number(second.savedAt || 0))
        .map(reconnectStoredQuizItem)
        .filter(Boolean);
    const progressById = new Map(progressRecords.map((record) => [String(record.id || ''), record]));
    const learnedPool = activeQuizData
        .map((item) => ({ item, progress: progressById.get(getQuestionProgressId(item)) }))
        .filter((entry) => entry.progress);
    const duePool = learnedPool
        .slice()
        .sort((first, second) => Number(first.progress.learnedAt || 0) - Number(second.progress.learnedAt || 0))
        .map((entry) => entry.item);
    const confidencePool = learnedPool
        .slice()
        .sort((first, second) => Number(second.progress.learnedAt || 0) - Number(first.progress.learnedAt || 0))
        .map((entry) => entry.item);

    const usedKeys = new Set();
    const wrong = takeRandomUniqueItems(wrongPool, 4, usedKeys);
    const wordbook = takeRandomUniqueItems(wordbookPool, 2, usedKeys);
    const due = takeOrderedDailyItems(duePool, 2, usedKeys);
    const confidence = takeOrderedDailyItems(confidencePool, 2, usedKeys);
    const hardReview = [...wrong, ...wordbook, ...due];
    const ordered = [];

    if (confidence[0]) ordered.push(confidence[0]);
    if (hardReview[0]) ordered.push(hardReview[0]);
    if (hardReview[1]) ordered.push(hardReview[1]);
    if (confidence[1]) ordered.push(confidence[1]);
    ordered.push(...hardReview.slice(2));

    const stageOnePool = activeQuizData.filter((item) => Number(item.stage) === 1);
    ordered.push(...takeRandomUniqueItems(stageOnePool, DAILY_QUIZ_QUESTION_COUNT - ordered.length, usedKeys));
    ordered.push(...takeRandomUniqueItems(activeQuizData, DAILY_QUIZ_QUESTION_COUNT - ordered.length, usedKeys));

    return ordered.slice(0, DAILY_QUIZ_QUESTION_COUNT);
}

async function getOrCreateDailyQuizSession() {
    const stored = readDailyQuizSession();
    if (stored && stored.questionKeys.every((key) => Boolean(findDailyQuizQuestion(key)))) {
        activeDailyQuizSession = stored;
        return stored;
    }

    const questions = await buildDailyQuizQuestions();
    if (questions.length !== DAILY_QUIZ_QUESTION_COUNT) {
        throw new Error('오늘의 퀴즈 10문제를 구성할 수 없습니다.');
    }
    const now = Date.now();
    const session = {
        version: DAILY_QUIZ_STORAGE_VERSION,
        dateKey: getDailyQuizDateKey(),
        questionKeys: questions.map(getDailyQuizQuestionKey),
        cleared: false,
        attempts: 0,
        lastScore: null,
        createdAt: now,
        attempt: { results: [], completed: false, startedAt: now }
    };
    saveDailyQuizSession(session);
    return session;
}

function resetDailyQuizAttempt() {
    const session = activeDailyQuizSession || readDailyQuizSession();
    if (!session) return;
    session.attempt = { results: [], completed: false, startedAt: Date.now() };
    saveDailyQuizSession(session);
}

function updateDailyQuizBanner() {
    const button = document.getElementById('daily-quiz-banner');
    const status = document.getElementById('daily-quiz-status');
    const subtitle = document.getElementById('daily-quiz-subtitle');
    if (!button || !status || !subtitle) return;

    const isStageScreen = (window.selectionStep || 'stage') === 'stage';
    button.hidden = !isStageScreen;
    if (!isStageScreen) {
        stopDailyQuizBannerCelebration(button);
        return;
    }

    const achievement = migrateLegacyDailyQuizAchievement();
    const session = readDailyQuizSession();
    activeDailyQuizSession = session;
    button.classList.toggle('is-cleared', Boolean(session?.cleared));
    if (session?.cleared) {
        const streak = Math.max(1, Number(achievement.currentStreak) || 1);
        status.textContent = streak === 1
            ? uiT('dailyQuizOneDayAchieved')
            : uiT('dailyQuizStreakAchieved', { count: streak });
        subtitle.textContent = uiT('dailyQuizCompletedSubtitle', {
            count: Math.max(streak, Number(achievement.bestStreak) || 1)
        });
    } else if (session?.attempt?.completed) {
        status.textContent = uiT('dailyQuizRetryStatus', { score: Number(session.lastScore || 0) });
        subtitle.textContent = uiT('dailyQuizSubtitle');
    } else if (session?.attempt?.results?.length) {
        status.textContent = uiT('dailyQuizContinue', {
            current: Math.min(DAILY_QUIZ_QUESTION_COUNT, session.attempt.results.length + 1),
            total: DAILY_QUIZ_QUESTION_COUNT
        });
        subtitle.textContent = uiT('dailyQuizSubtitle');
    } else {
        const target = getNextDailyQuizStreakTarget(achievement);
        status.textContent = target === 1
            ? uiT('dailyQuizFirstChallenge')
            : uiT('dailyQuizNextStreakChallenge', { count: target });
        subtitle.textContent = uiT('dailyQuizSubtitle');
    }
    button.setAttribute('aria-label', `${uiT('dailyQuizTitle')} · ${status.textContent}`);
    startDailyQuizBannerCelebration(button, Boolean(session?.cleared));
}

async function startDailyQuiz() {
    if (window.isSelectingQuizSection) return;
    window.isSelectingQuizSection = true;
    try {
        stopDailyQuizBannerCelebration();
        const session = await getOrCreateDailyQuizSession();
        if (session.attempt?.completed || session.attempt?.results?.length >= DAILY_QUIZ_QUESTION_COUNT) {
            resetDailyQuizAttempt();
        }
        const firstQuestion = findDailyQuizQuestion(session.questionKeys[0]);
        if (firstQuestion && typeof unlockAudio === 'function') {
            await unlockAudio(firstQuestion.category || firstQuestion.section || '', Number(firstQuestion.stage) || 1);
        }

        window.selectedQuizCategory = '';
        window.selectedQuizSection = VIRTUAL_SECTION_DAILY;
        window.selectionStep = 'stage';
        document.getElementById('section-select-screen').style.display = 'none';
        document.getElementById('quiz-card').style.display = 'block';
        await restartQuiz();
    } catch (error) {
        console.error('오늘의 퀴즈 시작 실패:', error);
        showStreakToast(uiT('dataLoadError'), false);
    } finally {
        window.isSelectingQuizSection = false;
    }
}

function makeDailyQuizResultItem(question, status) {
    const stage = Number(question?.stage) || 1;
    return {
        id: question?.id || '',
        hanzi: getResultHeadword(question),
        kanji: question?.kanji || '',
        reading: question?.reading || '',
        pinyin: question?.pinyin || '',
        meaning: question?.meaning || '',
        example: question?.example || '',
        exampleTrans: question?.exampleTrans || '',
        note: question?.note || '',
        audioFile: question?.audioFile || '',
        answerAudioFile: question?.answerAudioFile || '',
        isGlobalData: Boolean(question?.isGlobalData),
        learningLanguage: question?.learningLanguage || '',
        interfaceLanguage: question?.interfaceLanguage || '',
        stage,
        category: question?.category || '',
        timeout: status === 'timeout'
    };
}

function restoreDailyQuizAttempt() {
    if (window.selectedQuizSection !== VIRTUAL_SECTION_DAILY) return false;
    const session = activeDailyQuizSession || readDailyQuizSession();
    const results = session?.attempt?.results;
    if (!Array.isArray(results) || results.length === 0 || session.attempt.completed) return false;

    const validResults = results.slice(0, shuffledQuestions.length).filter((result, index) =>
        result && result.questionKey === getDailyQuizQuestionKey(shuffledQuestions[index])
    );
    if (validResults.length !== results.length) {
        resetDailyQuizAttempt();
        return false;
    }

    score = validResults.filter((result) => result.status === 'correct').length;
    currentIdx = validResults.length;
    wrongAnswers = [];
    correctAnswers = [];
    validResults.forEach((result, index) => {
        const item = makeDailyQuizResultItem(shuffledQuestions[index], result.status);
        if (result.status === 'correct') correctAnswers.push(item);
        else wrongAnswers.push(item);
    });
    return currentIdx > 0 && currentIdx < shuffledQuestions.length;
}

function recordDailyQuizAttemptResult(question, status) {
    if (window.selectedQuizSection !== VIRTUAL_SECTION_DAILY) return;
    const session = activeDailyQuizSession || readDailyQuizSession();
    if (!session || session.dateKey !== getDailyQuizDateKey()) return;
    const results = Array.isArray(session.attempt?.results) ? session.attempt.results.slice(0, currentIdx) : [];
    results[currentIdx] = { questionKey: getDailyQuizQuestionKey(question), status };
    session.attempt = {
        ...(session.attempt || {}),
        results,
        completed: false,
        startedAt: Number(session.attempt?.startedAt || Date.now())
    };
    saveDailyQuizSession(session);
}

function completeDailyQuizAttempt(finalScore) {
    if (window.selectedQuizSection !== VIRTUAL_SECTION_DAILY) return;
    const session = activeDailyQuizSession || readDailyQuizSession();
    if (!session) return;
    session.attempt = {
        ...(session.attempt || {}),
        completed: true,
        completedAt: Date.now()
    };
    session.attempts = Number(session.attempts || 0) + 1;
    session.lastScore = Number(finalScore || 0);
    if (finalScore === DAILY_QUIZ_QUESTION_COUNT) {
        session.cleared = true;
        session.clearedAt = Date.now();
    }
    saveDailyQuizSession(session);
    if (finalScore === DAILY_QUIZ_QUESTION_COUNT) {
        recordDailyQuizAchievement(new Date(session.clearedAt));
    }
    updateDailyQuizBanner();
}

function isSpecialReviewSection(sectionKey = window.selectedQuizSection) {
    return sectionKey === VIRTUAL_SECTION_WRONG || sectionKey === VIRTUAL_SECTION_WORDBOOK || sectionKey === VIRTUAL_SECTION_DAILY;
}

function updateResultActionButtons() {
    const sectionKey = window.selectedQuizSection;
    const restartStageBtn = document.getElementById('restart-stage-btn');
    const backSameBtns = document.querySelectorAll('.js-action-result-back-same');
    const backAllBtn = document.getElementById('result-back-all-btn');
    const retryWrap = document.getElementById('result-retry-wrap');

    if (sectionKey === VIRTUAL_SECTION_DAILY) {
        if (retryWrap) retryWrap.hidden = score === TOTAL_QUESTIONS;
        if (restartStageBtn) restartStageBtn.textContent = uiT('dailyQuizRetrySame');
        backSameBtns.forEach((button) => { button.style.display = 'none'; });
        if (backAllBtn) {
            backAllBtn.style.display = '';
            backAllBtn.textContent = uiT('backToStages');
        }
        return;
    }

    if (retryWrap) retryWrap.hidden = false;
    backSameBtns.forEach((button) => { button.style.display = ''; });

    if (sectionKey === VIRTUAL_SECTION_WRONG) {
        if (restartStageBtn) restartStageBtn.textContent = `🔥 ${uiT('wrongClear')}`;
        backSameBtns.forEach((button) => { button.textContent = uiT('backToSections'); });
        if (backAllBtn) backAllBtn.style.display = 'none';
        return;
    }

    if (sectionKey === VIRTUAL_SECTION_WORDBOOK) {
        if (restartStageBtn) restartStageBtn.textContent = `⭐ ${uiT('myWordbook')}`;
        backSameBtns.forEach((button) => { button.textContent = uiT('backToSections'); });
        if (backAllBtn) backAllBtn.style.display = 'none';
        return;
    }

    if (restartStageBtn) restartStageBtn.textContent = uiT('retryStage');
    backSameBtns.forEach((button) => { button.textContent = uiT('backToSections'); });
    if (backAllBtn) backAllBtn.style.display = '';
}

// 기존 getSectionMetaByKey()를 이렇게 확장
function getSectionMetaByKey(sectionKey) {
    const virtual = getVirtualSectionMeta(sectionKey);
    if (virtual) return virtual;

    const found = getRegisteredSections().find((section) => section.key === sectionKey);
    if (found) return found;
    return { key: sectionKey, label: String(sectionKey || ''), emoji: '📘' };
}


function resolveSelectionLabel() {
    const sectionKey = window.selectedQuizSection || getDefaultSectionKey();
    const stageKey = window.selectedQuizCategory || '';

    if (!sectionKey) return uiT('notSelected');

    const meta = getSectionMetaByKey(sectionKey);
    const stage = Number(stageKey);
    if (Number.isInteger(stage) && stage >= 1 && stage <= 10) {
        return `${meta.label} · ${uiT('stage', { stage })}`;
    }

    return `${meta.label}`;
}

function updateSectionTopicText() {
    const label = resolveSelectionLabel();
    const sectionKey = window.selectedQuizSection || getDefaultSectionKey();
    const stageKey = window.selectedQuizCategory || '';
    const meta = getSectionMetaByKey(sectionKey);
    const stage = Number(stageKey);

    const quizTopicEl = document.getElementById('current-topic-inline');
    if (quizTopicEl) {
        if (sectionKey) {
            let stageText = '';
            if (Number.isInteger(stage) && stage >= 1 && stage <= 10) {
                stageText = `<span class="quiz-topic-separator" aria-hidden="true">·</span><span>${escapeHtml(uiT('stage', { stage }))}</span>`;
            }
            quizTopicEl.innerHTML = `
                <span class="quiz-topic-context">
                    <span>${escapeHtml(meta.label)}</span>
                    ${stageText}
                </span>
            `;
        } else {
            quizTopicEl.textContent = label;
        }

        const sectionSelectScreen = document.getElementById('section-select-screen');
        const isSectionSelectVisible = sectionSelectScreen && sectionSelectScreen.style.display !== 'none';
        quizTopicEl.style.opacity = isSectionSelectVisible ? '0' : '1';
    }

    const resultTopicEl = document.getElementById('result-topic-text');
    if (resultTopicEl) {
        if (sectionKey) {
            const sectionChip = `
                <span class="result-topic-chip result-topic-chip-section">
                    <span class="result-topic-emoji">${escapeHtml(meta.emoji)}</span>
                    <span class="result-topic-text-main">${escapeHtml(meta.label)}</span>
                </span>
            `;

            let stageChip = '';
            if (Number.isInteger(stage) && stage >= 1 && stage <= 10) {
                stageChip = `
                    <span class="result-topic-chip result-topic-chip-stage">
                        <span class="result-topic-text-main">${escapeHtml(uiT('stage', { stage }))}</span>
                    </span>
                `;
            }

            resultTopicEl.innerHTML = `<div class="result-topic-chip-row">${sectionChip}${stageChip}</div>`;
        } else {
            resultTopicEl.textContent = label;
        }
    }
}
// ★ renderSectionButtons()의 section 단계 부분을 async로 변경하여 개수 반영
async function renderSectionButtons() {
    const sectionGrid = document.getElementById('section-grid');
    if (!sectionGrid) return;

    resetCompletionCardCelebrations();

    const step = window.selectionStep || 'stage';
    if (window.TentenPwaInstall && typeof window.TentenPwaInstall.setScreen === 'function') {
        window.TentenPwaInstall.setScreen(step);
    }
    const descEl = document.getElementById('selection-step-desc');
    const backBtn = document.getElementById('selection-back-btn');
    const bannerEl = document.getElementById('selected-section-banner');
    const languageBadgeEl = document.getElementById('language-badge');
    const learningRecordsManager = document.getElementById('learning-records-manager');

    sectionGrid.innerHTML = '';
    if (languageBadgeEl) languageBadgeEl.hidden = step !== 'stage';
    if (learningRecordsManager) learningRecordsManager.hidden = step !== 'stage';
    updateDailyQuizBanner();

    if (step === 'section') {
        const selectedStage = window.selectedQuizCategory || getDefaultStageKey();
        const sections = getAvailableSectionsByStage(selectedStage);
        const learnedRecords = typeof getLearningProgressByStage === 'function'
            ? await getLearningProgressByStage(selectedStage)
            : [];
        const learnedIds = new Set(learnedRecords.map((item) => item.id));
        let totalQuestionCount = 0;
        let totalLearnedCount = 0;

        if (bannerEl) {
            bannerEl.style.display = 'block';
            bannerEl.innerHTML = `
                <div class="selected-section-chip">
                    <span class="selected-section-emoji">📚</span>
                    <span class="selected-section-text">${escapeHtml(uiT('stage', { stage: selectedStage }))}</span>
                </div>
            `;
        }

        // 기존 10개 섹션 버튼
        let completedSectionOrder = 0;
        sections.forEach((section) => {
            const sectionQuestions = getUniqueSectionQuestions(selectedStage, section.key);
            const learnedCount = sectionQuestions.reduce(
                (count, item) => count + (learnedIds.has(getQuestionProgressId(item)) ? 1 : 0),
                0
            );
            const remainingCount = Math.max(0, sectionQuestions.length - learnedCount);
            const isComplete = sectionQuestions.length > 0 && remainingCount === 0;
            totalQuestionCount += sectionQuestions.length;
            totalLearnedCount += learnedCount;

            const button = document.createElement('button');
            button.className = `section-btn${isComplete ? ' completed-progress-btn completed-section-btn' : ''}`;
            button.type = 'button';
            button.addEventListener('click', () => {
                resetCompletionCardCelebrations();
                selectSection(section.key);
            });
            button.innerHTML = `
                <span class="section-emoji">${escapeHtml(section.emoji)}</span>
                <span class="section-label">${escapeHtml(section.label)}</span>
                <span class="section-progress-badge ${isComplete ? 'is-complete' : ''}">
                    ${escapeHtml(isComplete ? uiT('complete') : uiT('remaining', { count: remainingCount }))}
                </span>
            `;
            sectionGrid.appendChild(button);
            if (isComplete) {
                startCompletionCardCelebration(button, completedSectionOrder);
                completedSectionOrder += 1;
            }
        });

        // ★★★ 오답 클리어하기 / 내 단어장 개수 조회 후 추가 ★★★
        const [wrongCount, wordbookCount] = await Promise.all([
            getWrongBankCountByStage(selectedStage),
            getWordbookCountByStage(selectedStage)
        ]);

        const wrongBtn = document.createElement('button');
        wrongBtn.className = 'section-btn special-section-btn wrong-bank-section-btn';
        wrongBtn.type = 'button';
        wrongBtn.addEventListener('click', () => {
            resetCompletionCardCelebrations();
            selectSection(VIRTUAL_SECTION_WRONG);
        });
        wrongBtn.innerHTML = `
            ${escapeHtml(uiT('wrongClear'))}
            <span class="section-count-badge ${wrongCount > 0 ? 'has-count' : 'zero-count'}">${escapeHtml(uiT('count', { count: wrongCount }))}</span>
        `;
        sectionGrid.appendChild(wrongBtn);

        const wordbookBtn = document.createElement('button');
        wordbookBtn.className = 'section-btn special-section-btn wordbook-section-btn';
        wordbookBtn.type = 'button';
        wordbookBtn.addEventListener('click', () => {
            resetCompletionCardCelebrations();
            selectSection(VIRTUAL_SECTION_WORDBOOK);
        });
        wordbookBtn.innerHTML = `
            ${escapeHtml(uiT('myWordbook'))}
            <span class="section-count-badge ${wordbookCount > 0 ? 'has-count' : 'zero-count'}">${escapeHtml(uiT('count', { count: wordbookCount }))}</span>
        `;
        sectionGrid.appendChild(wordbookBtn);

        if (descEl) {
            const totalRemainingCount = Math.max(0, totalQuestionCount - totalLearnedCount);
            descEl.style.display = 'block';
            descEl.innerHTML = `<b>${escapeHtml(uiT('learnedSummary', { learned: totalLearnedCount, remaining: totalRemainingCount }))}</b>`;
        }
        if (backBtn) backBtn.style.display = 'inline-block';
        return;
    }

    // ---- 스테이지 선택 단계 (기존과 동일) ----
    if (bannerEl) { bannerEl.style.display = 'none'; bannerEl.innerHTML = ''; }

    const stages = getAvailableStages();
    const stageEmojis = ['🌱', '🐣', '📖', '✏️', '💬', '🧠', '🔥', '⭐', '🏆', '👑'];
    const stageProgress = await Promise.all(stages.map(async (stage) => {
        const stageQuestions = activeQuizData.filter((item) => Number(item.stage) === Number(stage));
        const uniqueQuestionIds = new Set(stageQuestions.map((item) => getQuestionProgressId(item)));
        const learnedRecords = typeof getLearningProgressByStage === 'function'
            ? await getLearningProgressByStage(String(stage))
            : [];
        const learnedIds = new Set(learnedRecords.map((item) => item.id));
        const learnedCount = Array.from(uniqueQuestionIds).reduce(
            (count, id) => count + (learnedIds.has(id) ? 1 : 0),
            0
        );

        return {
            stage,
            questionCount: uniqueQuestionIds.size,
            remainingCount: Math.max(0, uniqueQuestionIds.size - learnedCount)
        };
    }));

    let completedStageOrder = 0;
    stageProgress.forEach(({ stage, questionCount, remainingCount }) => {
        const isComplete = questionCount > 0 && remainingCount === 0;
        const button = document.createElement('button');
        button.className = `section-btn stage-select-btn${isComplete ? ' completed-progress-btn completed-stage-btn' : ''}`;
        button.type = 'button';
        button.addEventListener('click', () => {
            resetCompletionCardCelebrations();
            selectStage(String(stage));
        });
        button.innerHTML = `
            <span class="section-emoji stage-select-emoji">${stageEmojis[stage - 1] || '📚'}</span>
            <span class="stage-title">${escapeHtml(uiT('stage', { stage }))}</span>
            <span class="section-progress-badge ${isComplete ? 'is-complete' : ''}">
                ${escapeHtml(isComplete ? uiT('complete') : uiT('remaining', { count: remainingCount }))}
            </span>
        `;
        sectionGrid.appendChild(button);
        if (isComplete) {
            startCompletionCardCelebration(button, completedStageOrder);
            completedStageOrder += 1;
        }
    });

    if (descEl) {
        descEl.style.display = 'none';
        descEl.innerHTML = '';
    }
    if (backBtn) backBtn.style.display = 'none';
}


function initializeSectionSelection() {
    if (!window.selectionStep) {
        window.selectionStep = 'stage';
    }
    if (!window.selectedQuizSection) {
        window.selectedQuizSection = getDefaultSectionKey();
    }
    renderSectionButtons();
    updateSectionTopicText();
}

function buildQuizDataFromSectionArrays() {
    const rawData = getRegisteredSections().flatMap((section) => {
        const sectionData = Array.isArray(section.data) ? section.data : [];
        return sectionData.map((item) => {
            const globalItem = typeof window.resolveGlobalQuizItem === 'function'
                ? window.resolveGlobalQuizItem(item)
                : null;
            const meaning = String((globalItem && globalItem.meaning) || item.meaning || '').trim();
            const word = String((globalItem && globalItem.targetWord) || item.hanzi || item.kanji || item.word || '').trim();
            const pronunciation = String((globalItem && globalItem.quizText) || item.pinyin || item.reading || item.pronunciation || '').trim();
            const spokenReading = String((globalItem && globalItem.targetReading) || item.reading || word).trim();
            const note = String((globalItem && globalItem.note) || item.note || '').trim();
            const audioFile = String((globalItem && globalItem.audioFile) || item.audioFile || '').trim();
            const answerAudioFile = String((globalItem && globalItem.answerAudioFile) || item.answerAudioFile || '').trim();

            return {
                ...item,
                category: section.key,
                section: section.key,
                stage: Number(item.stage) || 1,
                kanji: '',
                reading: spokenReading,
                hanzi: word,
                pinyin: pronunciation,
                meaning,
                note: note || buildFallbackNote(item, word, meaning),
                audioFile,
                answerAudioFile,
                isGlobalData: Boolean(globalItem),
                learningLanguage: globalItem ? globalItem.learningLanguage : '',
                interfaceLanguage: globalItem ? globalItem.interfaceLanguage : ''
            };
        });
    });

    if (!rawData.length) {
        return (typeof quizData !== 'undefined' && Array.isArray(quizData)) ? quizData : [];
    }

    return rawData.map((item) => {
        const hasOptions = Array.isArray(item.options) && item.options.length >= 2;
        const hasCorrectIndex = Number.isInteger(item.correct) && item.correct >= 0 && item.correct < (item.options || []).length;
        if (hasOptions && hasCorrectIndex) {
            return item;
        }

        const distractors = typeof window.getTentenDistractorPool === 'function'
            ? window.getTentenDistractorPool(rawData, item)
            : rawData
                .filter((candidate) =>
                    Number(candidate.stage) === Number(item.stage) &&
                    candidate.category === item.category &&
                    candidate.meaning !== item.meaning
                )
                .map((candidate) => candidate.meaning);
        shuffleInPlace(distractors);

        const picked = distractors.slice(0, 3);
        const options = shuffleInPlace([item.meaning, ...picked]);
        const correct = options.indexOf(item.meaning);

        return {
            ...item,
            options,
            correct
        };
    });
}

let activeQuizData = [];

const pinyinCountMap = {};
const examplePinyinMap = {};
function rebuildPinyinCountMap() {
    Object.keys(pinyinCountMap).forEach((key) => delete pinyinCountMap[key]);
    activeQuizData.forEach((item) => {
        const key = String(item.pinyin || '').trim();
        if (!key) return;
        pinyinCountMap[key] = (pinyinCountMap[key] || 0) + 1;
    });
}

function rebuildExamplePinyinMap() {
    Object.keys(examplePinyinMap).forEach((key) => delete examplePinyinMap[key]);
    activeQuizData.forEach((item) => {
        const example = String(item.example || '').trim();
        const examplePinyin = String(item.examplePinyin || '').trim();
        if (!example || !examplePinyin) return;
        if (!examplePinyinMap[example]) {
            examplePinyinMap[example] = examplePinyin;
        }
    });
}

async function initializeQuizApp() {
    try {
        bindStaticUiEvents();
        initializeGlobalLanguageSelectors();

        if (typeof window.loadQuizSectionsFromJson === 'function') {
            await window.loadQuizSectionsFromJson();
        }

        activeQuizData = buildQuizDataFromSectionArrays();
        rebuildPinyinCountMap();
        rebuildExamplePinyinMap();
        initializeSectionSelection();

        if (!activeQuizData.length) {
            const sectionGrid = document.getElementById('section-grid');
            if (sectionGrid) {
                sectionGrid.innerHTML = `<p class="section-grid-error">${escapeHtml(uiT('dataLoadError'))}</p>`;
            }
        }
    } catch (error) {
        console.error('퀴즈 초기화 실패:', error);
        const sectionGrid = document.getElementById('section-grid');
        if (sectionGrid) {
            sectionGrid.innerHTML = `<p class="section-grid-error">${escapeHtml(uiT('dataLoadError'))}</p>`;
        }
    }
}

function initializeGlobalLanguageSelectors() {
    if (!window.tentenGlobal || !Array.isArray(window.TENTEN_LANGUAGES)) return;

    const learningSelect = document.getElementById('learning-language-select');
    const interfaceSelect = document.getElementById('interface-language-select');
    const chineseReadingField = document.getElementById('chinese-reading-field');
    const chineseReadingSelect = document.getElementById('chinese-reading-select');
    const languageBadge = document.getElementById('language-badge');
    if (!learningSelect || !interfaceSelect) return;

    const buildOptionsHtml = (languages, getLabel = (language) => language.label) => languages.map((language) =>
        `<option value="${escapeHtml(language.code)}">${escapeHtml(getLabel(language))}</option>`
    ).join('');

    interfaceSelect.innerHTML = buildOptionsHtml(window.TENTEN_LANGUAGES);
    interfaceSelect.value = window.tentenGlobal.interfaceLanguage;

    const availableLearningLanguages = typeof window.getTentenLearningLanguages === 'function'
        ? window.getTentenLearningLanguages(window.tentenGlobal.interfaceLanguage)
        : window.TENTEN_LANGUAGES.filter((language) => language.code !== window.tentenGlobal.interfaceLanguage);
    const selectedLearningLanguage = availableLearningLanguages.some(
        (language) => language.code === window.tentenGlobal.learningLanguage
    )
        ? window.tentenGlobal.learningLanguage
        : availableLearningLanguages[0] && availableLearningLanguages[0].code;

    learningSelect.innerHTML = buildOptionsHtml(availableLearningLanguages, (language) => (
        typeof window.getTentenLearningLanguageLabel === 'function'
            ? window.getTentenLearningLanguageLabel(language.code)
            : language.label
    ));
    if (selectedLearningLanguage) {
        learningSelect.value = selectedLearningLanguage;
        if (selectedLearningLanguage !== window.tentenGlobal.learningLanguage) {
            window.setTentenGlobalPreference('learningLanguage', selectedLearningLanguage);
        }
    }

    const applyPageLanguage = () => {
        const interfaceLanguage = window.getTentenLanguage(window.tentenGlobal.interfaceLanguage);
        const learningLanguage = window.getTentenLanguage(window.tentenGlobal.learningLanguage);
        document.documentElement.lang = interfaceLanguage.code === 'zh-CN'
            ? 'zh-Hans'
            : interfaceLanguage.code === 'zh-TW'
                ? 'zh-Hant'
                : interfaceLanguage.code;
        document.documentElement.dir = interfaceLanguage.direction;
        if (languageBadge) languageBadge.textContent = uiT('learningBadge', { language: learningLanguage.label });
        if (chineseReadingField) chineseReadingField.hidden = learningLanguage.code !== 'zh-TW';
        if (chineseReadingSelect) chineseReadingSelect.value = window.tentenGlobal.chineseReading;
    };

    const reloadWithCurrentPreferences = () => {
        if (typeof window.buildTentenPreferenceUrl === 'function') {
            window.location.assign(window.buildTentenPreferenceUrl(window.location.href));
            return;
        }
        window.location.reload();
    };

    learningSelect.addEventListener('change', () => {
        window.setTentenGlobalPreference('learningLanguage', learningSelect.value);
        reloadWithCurrentPreferences();
    });
    interfaceSelect.addEventListener('change', () => {
        const nextInterfaceLanguage = interfaceSelect.value;
        if (window.tentenGlobal.learningLanguage === nextInterfaceLanguage) {
            const replacement = window.TENTEN_LANGUAGES.find(
                (language) => language.code !== nextInterfaceLanguage
            );
            if (replacement) window.setTentenGlobalPreference('learningLanguage', replacement.code);
        }
        window.setTentenGlobalPreference('interfaceLanguage', nextInterfaceLanguage);
        reloadWithCurrentPreferences();
    });
    if (chineseReadingSelect) {
        chineseReadingSelect.addEventListener('change', () => {
            window.setTentenGlobalPreference('chineseReading', chineseReadingSelect.value);
            reloadWithCurrentPreferences();
        });
    }

    if (typeof window.applyTentenI18n === 'function') window.applyTentenI18n(document);
    const progressText = document.getElementById('progress-text');
    if (progressText) progressText.textContent = uiT('questionProgress', { current: 0, total: QUIZ_QUESTION_LIMIT });
    const repeatRoundToast = document.getElementById('repeat-round-toast');
    if (repeatRoundToast) repeatRoundToast.textContent = uiT('repeatRound', { round: 1 });
    updateTimerDisplay();
    applyPageLanguage();
}

const QUIZ_QUESTION_LIMIT = 10;
let TOTAL_QUESTIONS = QUIZ_QUESTION_LIMIT;
const TIME_PER_QUESTION = 10;
const AUTO_REPEAT_GAP_MS = 400;
const AUTO_REPEAT_STOP_THRESHOLD = 3;
const ANSWER_REVEAL_MS = 5000;
const ANSWER_REVEAL_ANIM_MS = 300;
const ANSWER_REVEAL_EXIT_MS = 180;
const OPTION_HIGHLIGHT_KEYWORDS = [
    '특대 사이즈',
    '큰 사이즈',
    '작은 사이즈',
    '중간 사이즈',
    '특대',
    '큰',
    '작은',
    '중간'
];
const PINYIN_STOP_WORDS = new Set(['de', 'le', 'ma', 'ne', 'a', 'ba', 'ya', 'ge', 'er', 'wo', 'ni', 'ta', 'women', 'nimen', 'tamen', 'zhe', 'na']);

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escapeHtmlWithLineBreaks(text) {
    return escapeHtml(text).replace(/\r?\n/g, '<br>');
}

function normalizePinyinToken(token) {
    return String(token)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function normalizeOptionToken(token) {
    return String(token || '').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
}

function toQuickMeaningLabel(meaningText) {
    const normalized = String(meaningText || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';

    const split = normalized.split(/\s*(?:,|;|\/|·|또는|및)\s*/u);
    const first = (split[0] || '').trim();
    return first || normalized;
}

function buildQuizOptionLabels(optionTexts) {
    const quickLabels = optionTexts.map((text) => toQuickMeaningLabel(text));
    const counts = new Map();

    quickLabels.forEach((label) => {
        counts.set(label, (counts.get(label) || 0) + 1);
    });

    // If compressed labels collide, keep original for those entries to avoid ambiguous choices.
    return optionTexts.map((original, idx) => {
        const label = quickLabels[idx];
        if (!label) return original;
        if ((counts.get(label) || 0) > 1) return original;
        return label;
    });
}

function mergeIndexRanges(ranges) {
    if (!ranges.length) return [];
    const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
    const merged = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
        const prev = merged[merged.length - 1];
        const curr = sorted[i];
        if (curr.start <= prev.end + 1) {
            prev.end = Math.max(prev.end, curr.end);
        } else {
            merged.push(curr);
        }
    }
    return merged;
}

function findPhraseStartIndexByTokens(rawTokens, phraseTokens) {
    const normalizedRaw = rawTokens.map((token) => normalizePinyinToken(token));
    const normalizedPhrase = phraseTokens.map((token) => normalizePinyinToken(token));

    for (let i = 0; i <= normalizedRaw.length - normalizedPhrase.length; i++) {
        let matched = true;
        for (let j = 0; j < normalizedPhrase.length; j++) {
            if (normalizedRaw[i + j] !== normalizedPhrase[j]) {
                matched = false;
                break;
            }
        }
        if (matched) return i;
    }
    return -1;
}

function analyzeOptionContrast(optionTexts) {
    const options = Array.isArray(optionTexts) ? optionTexts.map((text) => String(text || '').trim()) : [];
    if (options.length < 2) {
        return { hasSharedSuffix: false, focusByOption: new Map() };
    }

    const tokenized = options.map((text) => text.split(/\s+/).filter(Boolean));
    if (tokenized.some((tokens) => !tokens.length)) {
        return { hasSharedSuffix: false, focusByOption: new Map() };
    }

    let prefixLen = 0;
    while (true) {
        const probe = prefixLen + 1;
        const firstTokens = tokenized[0];
        if (firstTokens.length < probe) break;

        const pivot = normalizeOptionToken(firstTokens[probe - 1]);
        if (!pivot) break;

        const allMatched = tokenized.every((tokens) => {
            if (tokens.length < probe) return false;
            return normalizeOptionToken(tokens[probe - 1]) === pivot;
        });

        if (!allMatched) break;
        prefixLen = probe;
    }

    let suffixLen = 0;
    while (true) {
        const probe = suffixLen + 1;
        const firstTokens = tokenized[0];
        if (firstTokens.length < probe) break;

        const remainingLen = firstTokens.length - prefixLen;
        if (remainingLen < probe) break;

        const pivot = normalizeOptionToken(firstTokens[firstTokens.length - probe]);
        if (!pivot) break;

        const allMatched = tokenized.every((tokens) => {
            if (tokens.length < probe) return false;
            if ((tokens.length - prefixLen) < probe) return false;
            return normalizeOptionToken(tokens[tokens.length - probe]) === pivot;
        });

        if (!allMatched) break;
        suffixLen = probe;
    }

    const focusByOption = new Map();
    const hasSharedBoundary = prefixLen > 0 || suffixLen > 0;
    if (!hasSharedBoundary) {
        return { hasSharedSuffix: false, focusByOption };
    }

    tokenized.forEach((tokens, idx) => {
        const endExclusive = tokens.length - suffixLen;
        let focusTokens = tokens.slice(prefixLen, endExclusive).filter(Boolean);

        // 공통 접두/접미가 너무 강하면 구분 핵심이 사라질 수 있어 마지막 내용 토큰을 보정 강조
        if (!focusTokens.length) {
            const fallbackToken = tokens[tokens.length - 1];
            if (fallbackToken) {
                focusTokens = [fallbackToken];
            }
        }

        if (!focusTokens.length) return;
        focusByOption.set(options[idx], focusTokens.join(' '));
    });

    return {
        hasSharedSuffix: focusByOption.size >= 2,
        focusByOption
    };
}

function pickLeadingContentToken(pinyinText) {
    const text = String(pinyinText || '').trim();
    if (!text) return '';

    const rawTokens = text.split(/\s+/);
    for (const token of rawTokens) {
        const cleaned = token.replace(/^[^A-Za-z\u00C0-\u024F\u1E00-\u1EFFüÜ]+|[^A-Za-z\u00C0-\u024F\u1E00-\u1EFFüÜ]+$/g, '');
        if (!cleaned) continue;
        const normalized = normalizePinyinToken(cleaned);
        if (PINYIN_STOP_WORDS.has(normalized)) continue;
        return cleaned;
    }
    return '';
}

function pickPinyinFocusToken(pinyinText) {
    const text = String(pinyinText || '').trim();
    if (!text) return '';

    const rawTokens = text.split(/\s+/);
    let bestToken = '';
    let bestScore = -1;

    rawTokens.forEach((raw) => {
        const cleaned = raw.replace(/^[^A-Za-z\u00C0-\u024F\u1E00-\u1EFFüÜ]+|[^A-Za-z\u00C0-\u024F\u1E00-\u1EFFüÜ]+$/g, '');
        if (!cleaned) return;

        const normalized = normalizePinyinToken(cleaned);
        if (PINYIN_STOP_WORDS.has(normalized)) return;

        const score = normalized.length;
        if (score > bestScore) {
            bestToken = cleaned;
            bestScore = score;
        }
    });

    return bestToken;
}

function highlightPinyinFocus(pinyinText, customFocusToken, optionContrast) {
    const text = String(pinyinText || '').trim();
    if (!text) return '';

    const rawTokens = text.split(/\s+/).filter(Boolean);
    if (!rawTokens.length) return escapeHtml(text);

    const focusRanges = [];

    // 1) 문제별 커스텀 강조 구간(문구 단위) 우선 적용
    const customFocusList = Array.isArray(customFocusToken)
        ? customFocusToken
        : (customFocusToken ? [customFocusToken] : []);

    customFocusList.forEach((phrase) => {
        const phraseTokens = String(phrase || '').trim().split(/\s+/).filter(Boolean);
        if (!phraseTokens.length) return;
        const startIdx = findPhraseStartIndexByTokens(rawTokens, phraseTokens);
        if (startIdx >= 0) {
            focusRanges.push({ start: startIdx, end: startIdx + phraseTokens.length - 1 });
        }
    });

    // 2) 자동 강조: bu- 부정 핵심 동사 강조 (ex. buxihuan)
    rawTokens.forEach((token, idx) => {
        const normalized = normalizePinyinToken(token);
        if (normalized.startsWith('bu') && normalized.length >= 4) {
            focusRanges.push({ start: idx, end: idx });
        }
    });

    // 3) 자동 강조: 형용사 + de 구문 강조 (ex. xinla de)
    for (let i = 0; i < rawTokens.length - 1; i++) {
        const left = normalizePinyinToken(rawTokens[i]);
        const right = normalizePinyinToken(rawTokens[i + 1]);
        if (right === 'de' && left && !PINYIN_STOP_WORDS.has(left)) {
            focusRanges.push({ start: i, end: i + 1 });
        }
    }

    // 4) 아무 것도 없으면 기존처럼 핵심 1개 토큰 강조
    if (!focusRanges.length) {
        const fallbackToken = optionContrast && optionContrast.hasSharedSuffix
            ? pickLeadingContentToken(text)
            : pickPinyinFocusToken(text);
        if (fallbackToken) {
            const fallbackIdx = rawTokens.findIndex((token) => normalizePinyinToken(token) === normalizePinyinToken(fallbackToken));
            if (fallbackIdx >= 0) {
                focusRanges.push({ start: fallbackIdx, end: fallbackIdx });
            }
        }
    }

    if (!focusRanges.length) return escapeHtml(text);

    const mergedRanges = mergeIndexRanges(focusRanges);
    const htmlParts = [];

    for (let i = 0; i < rawTokens.length; i++) {
        const tokenHtml = escapeHtml(rawTokens[i]);
        const activeRange = mergedRanges.find((range) => i >= range.start && i <= range.end);

        if (activeRange) {
            if (i === activeRange.start) {
                const rangeText = rawTokens.slice(activeRange.start, activeRange.end + 1).join(' ');
                htmlParts.push(`<span class="pinyin-focus">${escapeHtml(rangeText)}</span>`);
            }
            if (i === activeRange.end) {
                continue;
            }
            continue;
        }

        htmlParts.push(tokenHtml);
    }

    return htmlParts.join(' ');
}

function highlightOptionFocus(optionText, customKeywords, contrast, forceHighlight) {
    const source = String(optionText || '').trim();
    if (!source) return '';

    if (!forceHighlight) {
        return escapeHtml(source);
    }

    // 4지선다에서는 보기 문장 전체를 강조해 가독성을 일관되게 유지한다.
    return `<span class="option-focus option-focus-full">${escapeHtml(source)}</span>`;
}

const CATEGORY_LABELS = {
    all: '🎲 전체 단어 랜덤',
    basic: '💬 기초 표현',
    number: '🔢 숫자·수량·양사',
    family: '👨‍👩‍👧 가족·호칭',
    time: '⏰ 시간·날짜',
    verb_basic: '🏃 기본 동사',
    verb_life: '🧹 생활 동작',
    hobby: '⚽ 취미·스포츠',
    place: '🏢 장소·건물',
    home: '🛋️ 집·가구·가전',
    country: '🌏 국가·언어·지리',
    food: '🍚 음식·요리',
    fruit: '🍎 과일·간식·음료',
    clothes: '👗 의류·색깔',
    traffic: '✈️ 교통·여행',
    work: '💼 직장·업무',
    school: '📚 학교·과목',
    adj: '✨ 형용사 종합',
    emotion: '😊 감정·심리',
    adv: '🔗 부사·접속사'
};

let shuffledQuestions = [];
let currentIdx = 0;
let score = 0;
let isClickable = false;

let wrongAnswers = [];
let correctAnswers = [];
let wordbookSessionStreaks = new Map();
let quizSessionMode = '';
let quizSessionCategory = null;
let wordbookResultRenderToken = 0;

function updateWordbookSessionStreak(item, wasCorrect, meaning) {
    if (window.selectedQuizSection !== VIRTUAL_SECTION_WORDBOOK || !item) return;
    const key = makeItemId(item.stage || window.selectedQuizCategory || 1, item.reading || item.hanzi || '', meaning || item.meaning || '');
    wordbookSessionStreaks.set(key, wasCorrect ? (wordbookSessionStreaks.get(key) || 0) + 1 : 0);
}

let currentCorrectText = "";
let timeLeft = TIME_PER_QUESTION;
let timerInterval = null;
let isPaused = false;

let currentHanzi = "";
let currentQuizItem = null;

let quizStartTime = 0;
let quizEndTime = 0;
let finalTotalTimeText = "0.00";

let excludedTimeMs = 0;

let currentAudio = null;

let isAutoRepeating = false;
let autoRepeatTimeoutId = null;
let advanceQuestionTimeoutId = null;
let answerRevealAdvanceToken = 0;
let cancelPendingNativeAnswerAudio = null;
let audioPlayToken = 0;
let isSoundEnabled = true;

const POPUP_SCALE_FACTOR = 1.4;

const PRONUNCIATION_AUDIO_DIR = 'audio';
const PRONUNCIATION_AUDIO_EXTENSION = 'mp3';
const DIALOGUE_AUDIO_DIR = 'audio_dialogue';
const DIALOGUE_AUDIO_SUFFIX = '_dialogue';
const DIALOGUE_AUDIO_EXTENSION = 'mp3';
const NATIVE_ANSWER_AUDIO_MAX_WAIT_MS = 8000;

// 오디오 자산 전용 URL 해석기.
// 이 프로젝트에서 호출되는 4개 지점은 모두 오디오(<audio>.src)이므로
// 여기 한 곳에서 R2 오리진을 적용하면 발음/회화/정답음성/언락 재생이 함께 전환됩니다.
function resolveTentenAssetUrl(source) {
    const raw = String(source || '').trim();
    if (!raw) return '';

    // 데이터에 절대 URL이 직접 박혀 있는 경우는 그대로 존중합니다.
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) {
        return new URL(raw, document.baseURI || window.location.href).href;
    }

    const audioBase = String(window.TENTEN_AUDIO_BASE_URL || '').replace(/\/+$/, '');
    if (audioBase) {
        // new URL()이 퍼센트 인코딩은 보존하고 '..' 같은 경로 이탈은 정규화합니다.
        return new URL(raw.replace(/^\/+/, ''), `${audioBase}/`).href;
    }

    // 폴백: 오디오 베이스가 비어 있으면 기존처럼 같은 오리진 상대 경로.
    return new URL(raw, document.baseURI || window.location.href).href;
}

function normalizeAudioStem(text) {
    return String(text || '')
        .trim()
        .normalize('NFC')
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getPronunciationAudioCandidates(term, quizItem = null) {
    const section = String(quizItem && (quizItem.category || quizItem.section) ? (quizItem.category || quizItem.section) : '').trim();
    const configuredAudioFile = String(quizItem && quizItem.audioFile ? quizItem.audioFile : '').trim();
    if (configuredAudioFile) {
        const cleaned = configuredAudioFile.replace(/^\.\//, '');
        if (/[\\/]/.test(cleaned)) {
            return [cleaned];
        }

        const fileName = /\.[a-z0-9]+$/i.test(cleaned) ? cleaned : `${cleaned}.mp3`;
        return [section
            ? `${PRONUNCIATION_AUDIO_DIR}/${encodeURIComponent(section)}/${encodeURIComponent(fileName)}`
            : `${PRONUNCIATION_AUDIO_DIR}/${encodeURIComponent(fileName)}`];
    }

    // 글로벌 데이터는 데이터에 연결된 정확한 음성 경로만 사용한다.
    // 경로가 비어 있어도 단어명으로 존재하지 않는 파일을 추측해 요청하지 않는다.
    if (quizItem && quizItem.isGlobalData) {
        return [];
    }

    const stem = normalizeAudioStem(term);
    if (!stem) return [];

    const filePath = `${encodeURIComponent(stem)}.${PRONUNCIATION_AUDIO_EXTENSION}`;
    if (section) {
        return [`${PRONUNCIATION_AUDIO_DIR}/${encodeURIComponent(section)}/${filePath}`];
    }

    // 섹션 정보가 없더라도 다른 섹션의 동명 음원을 대신 사용하지 않는다.
    return [`${PRONUNCIATION_AUDIO_DIR}/${filePath}`];
}

function playPronunciationAudio(term, quizItem = null, options = {}) {
    if (!isSoundEnabled) {
        return false;
    }

    const repeatMode = Boolean(options.repeatMode);
    const token = Number.isFinite(options.token) ? options.token : audioPlayToken;
    const candidates = getPronunciationAudioCandidates(term, quizItem);

    if (!candidates.length) {
        return false;
    }

    let candidateIndex = 0;

    const playCandidate = () => {
        if (repeatMode && token !== audioPlayToken) return false;

        const source = candidates[candidateIndex];
        const audio = currentAudio || new Audio();
        currentAudio = audio;
        audio.preload = 'auto';
        audio.volume = 1;
        audio.src = resolveTentenAssetUrl(source);

        // 같은 실패가 error 이벤트와 play() Promise 양쪽에서 보고되어도
        // 다음 후보 재생은 한 번만 실행한다.
        let didAdvanceCandidate = false;
        const advanceCandidate = () => {
            if (didAdvanceCandidate) return;
            didAdvanceCandidate = true;
            candidateIndex++;
            if (candidateIndex < candidates.length) {
                playCandidate();
            }
        };

        audio.onended = () => {
            if (repeatMode && isAutoRepeating && token === audioPlayToken) {
                autoRepeatTimeoutId = setTimeout(() => {
                    playRepeatOnce(term, token, quizItem);
                }, AUTO_REPEAT_GAP_MS);
            }
        };

        audio.onerror = advanceCandidate;

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(advanceCandidate);
        }

        return true;
    };

    return playCandidate();
}

function playNativeAnswerAudio(question) {
    if (!isSoundEnabled || !question) {
        return Promise.resolve();
    }

    const source = String(question.answerAudioFile || '').trim();
    if (!source) return Promise.resolve();

    return new Promise((resolve) => {
        const audio = currentAudio || new Audio();
        currentAudio = audio;
        audio.preload = 'auto';
        audio.volume = 1;

        let finished = false;
        let maximumWaitTimer = null;

        const finish = () => {
            if (finished) return;
            finished = true;
            if (maximumWaitTimer) clearTimeout(maximumWaitTimer);
            if (audio.onended === finish) audio.onended = null;
            if (audio.onerror === finish) audio.onerror = null;
            if (cancelPendingNativeAnswerAudio === cancel) {
                cancelPendingNativeAnswerAudio = null;
            }
            resolve();
        };

        const cancel = () => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (error) {
                // 이미 해제된 오디오는 별도 처리가 필요하지 않습니다.
            }
            finish();
        };

        cancelPendingNativeAnswerAudio = cancel;
        audio.onended = finish;
        audio.onerror = finish;
        maximumWaitTimer = setTimeout(finish, NATIVE_ANSWER_AUDIO_MAX_WAIT_MS);

        try {
            audio.src = resolveTentenAssetUrl(source);
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(finish);
            }
        } catch (error) {
            finish();
        }
    });
}

function getDialogueAudioCandidates(term, quizItem = null) {
    // audio_dialogue/ 자산이 R2에 아직 없습니다. 플래그가 꺼져 있으면
    // 존재하지 않는 파일에 대한 요청 자체를 만들지 않습니다.
    // (R2는 404 응답도 Class B 작업으로 과금합니다.)
    if (!window.TENTEN_DIALOGUE_AUDIO_ENABLED) return [];

    const configuredDialogueFile = String(
        quizItem && (quizItem.dialogueAudioFile || quizItem.exampleAudioFile)
            ? (quizItem.dialogueAudioFile || quizItem.exampleAudioFile)
            : ''
    ).trim();

    if (configuredDialogueFile) {
        const cleaned = configuredDialogueFile.replace(/^\.\//, '');
        if (/[\\/]/.test(cleaned)) {
            return [cleaned];
        }

        const fileName = /\.[a-z0-9]+$/i.test(cleaned) ? cleaned : `${cleaned}.mp3`;
        return [`${DIALOGUE_AUDIO_DIR}/${fileName}`];
    }

    const rawStem = normalizeAudioStemPreserveCase(term);
    const normalizedStem = normalizeAudioStem(term);
    const stemSet = new Set();

    if (rawStem) {
        stemSet.add(rawStem);
    }
    if (normalizedStem) {
        stemSet.add(normalizedStem);
    }

    if (!stemSet.size) return [];

    return Array.from(stemSet).map((stem) => {
        const baseName = `${stem}${DIALOGUE_AUDIO_SUFFIX}`;
        return `${DIALOGUE_AUDIO_DIR}/${encodeURIComponent(baseName)}.${DIALOGUE_AUDIO_EXTENSION}`;
    });
}

function playDialogueAudio(term, quizItem = null) {
    if (!isSoundEnabled) {
        return false;
    }

    const candidates = getDialogueAudioCandidates(term, quizItem);
    if (!candidates.length) {
        return false;
    }

    let candidateIndex = 0;

    const playCandidate = () => {
        const source = candidates[candidateIndex];
        const audio = currentAudio || new Audio();
        currentAudio = audio;
        audio.preload = 'auto';
        audio.volume = 1;
        audio.src = resolveTentenAssetUrl(source);

        audio.onerror = () => {
            candidateIndex++;
            if (candidateIndex < candidates.length) {
                playCandidate();
            }
        };

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                candidateIndex++;
                if (candidateIndex < candidates.length) {
                    playCandidate();
                }
            });
        }

        return true;
    };

    return playCandidate();
}

function ensureAnswerRevealPopup() {
    if (document.getElementById('answer-reveal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'answer-reveal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        display: none;
        z-index: 2147483647;
    `;

    const backdrop = document.createElement('div');
    backdrop.id = 'answer-reveal-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        border-radius: 26px;
        background: var(--reveal-overlay-hidden);
    `;

    const card = document.createElement('div');
    card.id = 'answer-reveal-card';
    card.style.cssText = `
        position: absolute;
        left: 50%;
        background: linear-gradient(135deg, var(--reveal-card-start), var(--reveal-card-end));
        border: 1px solid var(--reveal-card-border);
        border-radius: 24px;
        color: var(--reveal-card-text);
        font-weight: 800;
        text-align: center;
        line-height: 1.35;
        text-shadow: 0 2px 6px var(--reveal-card-text-shadow);
        word-break: keep-all;
        white-space: normal;
        box-sizing: border-box;
        opacity: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        padding: 12px 18px;
        transform-origin: top center;
        transform: translateX(-50%) scale(0.3);
    `;

    overlay.appendChild(backdrop);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
}

function fitAnswerRevealText(card, text, secondaryText, initialFontSize, minFontSize) {
    card.innerHTML = '';

    const meaning = document.createElement('div');
    meaning.className = 'answer-reveal-meaning';
    meaning.textContent = text;
    meaning.style.cssText = 'font-size: 1em; font-weight: 900; line-height: 1.25;';
    card.appendChild(meaning);

    if (secondaryText) {
        const original = document.createElement('div');
        original.className = 'answer-reveal-original';
        original.textContent = secondaryText;
        original.style.cssText = 'margin-top: 0.22em; font-size: 0.6em; font-weight: 600; line-height: 1.2; opacity: 0.72; text-shadow: none;';
        card.appendChild(original);
    }

    let fontSize = initialFontSize;
    card.style.fontSize = `${fontSize}px`;
    card.style.lineHeight = '1.35';

    const fits = () => card.scrollHeight <= card.clientHeight && card.scrollWidth <= card.clientWidth;

    while (fontSize > minFontSize && !fits()) {
        fontSize -= 1;
        card.style.fontSize = `${fontSize}px`;
    }

    // 폰트 축소만으로 부족하면 줄간격도 낮춰서 최종 잘림을 방지한다.
    if (!fits()) {
        card.style.lineHeight = '1.22';
        while (fontSize > 6 && !fits()) {
            fontSize -= 1;
            card.style.fontSize = `${fontSize}px`;
        }
    }

    return { fontSize, fits: fits() };
}

function showAnswerRevealPopup(text, secondaryText = '') {
    ensureAnswerRevealPopup();

    const overlay = document.getElementById('answer-reveal-overlay');
    const backdrop = document.getElementById('answer-reveal-backdrop');
    const card = document.getElementById('answer-reveal-card');
    const quizCard = document.getElementById('quiz-card');

    if (quizCard && backdrop) {
        const quizRect = quizCard.getBoundingClientRect();
        const radius = window.getComputedStyle(quizCard).borderRadius || '26px';
        backdrop.style.left = `${Math.max(0, quizRect.left)}px`;
        backdrop.style.top = `${Math.max(0, quizRect.top)}px`;
        backdrop.style.width = `${Math.max(0, quizRect.width)}px`;
        backdrop.style.height = `${Math.max(0, quizRect.height)}px`;
        backdrop.style.borderRadius = radius;
    }

    const buttons = document.querySelectorAll('.option-btn');

    let cardWidth = 320;
    let cardHeight = 90;
    let cardTop = window.innerHeight * 0.35;

    if (buttons.length >= 4) {
        const rect1 = buttons[0].getBoundingClientRect();
        const rect2 = buttons[1].getBoundingClientRect();
        const rect4 = buttons[3].getBoundingClientRect();

        const gridWidth = rect2.right - rect1.left;
        const gridHeight = rect4.bottom - rect1.top;

        const scaleLimitByWidth = gridWidth / rect1.width;
        const scaleLimitByHeight = gridHeight / rect1.height;

        const safeScale = Math.min(scaleLimitByWidth, scaleLimitByHeight) * 0.96;
        const finalScale = Math.max(POPUP_SCALE_FACTOR, safeScale);

        cardWidth = rect1.width * finalScale;
        cardHeight = rect1.height * finalScale;
        cardTop = rect1.top;
    }

    const maxAllowedWidth = window.innerWidth * 0.92;
    if (cardWidth > maxAllowedWidth) {
        const shrinkRatio = maxAllowedWidth / cardWidth;
        cardWidth = cardWidth * shrinkRatio;
        cardHeight = cardHeight * shrinkRatio;
    }

    const maxAllowedTop = window.innerHeight - cardHeight - 16;
    if (cardTop > maxAllowedTop) {
        cardTop = Math.max(16, maxAllowedTop);
    }

    card.style.width = `${cardWidth}px`;
    card.style.height = `${cardHeight}px`;
    card.style.top = `${cardTop}px`;

    // 정확한 측정을 위해 먼저 렌더링하되, 계산 중에는 보이지 않게 처리한다.
    overlay.style.display = 'block';
    overlay.style.visibility = 'hidden';

    let initialFontSize = cardHeight * 0.32;
    initialFontSize = Math.max(18, Math.min(initialFontSize, 56));

    let fitResult = fitAnswerRevealText(card, text, secondaryText, initialFontSize, 10);

    // 카드 크기는 고정하고 폰트만 추가로 줄여 최종 보정한다.
    if (!fitResult.fits) {
        fitResult = fitAnswerRevealText(card, text, secondaryText, fitResult.fontSize, 7);
    }

    if (!fitResult.fits) {
        fitAnswerRevealText(card, text, secondaryText, fitResult.fontSize, 6);
    }

    overlay.style.visibility = 'visible';

    backdrop.animate([
        { background: 'var(--reveal-overlay-hidden)', offset: 0 },
        { background: 'var(--reveal-overlay-visible)', offset: 1 }
    ], { duration: ANSWER_REVEAL_ANIM_MS, easing: 'ease-out', fill: 'forwards' });

    card.animate([
        { transform: 'translateX(-50%) scale(0.3)',  opacity: 0, boxShadow: '0 0 0 var(--reveal-glow-hidden)',    offset: 0 },
        { transform: 'translateX(-50%) scale(1.12)', opacity: 1, boxShadow: '0 0 20px 6px var(--reveal-glow-strong)', offset: 0.45 },
        { transform: 'translateX(-50%) scale(1.03)', opacity: 1, boxShadow: '0 0 12px 3px var(--reveal-glow-soft)', offset: 1 }
    ], { duration: ANSWER_REVEAL_ANIM_MS, easing: 'cubic-bezier(0.22, 0.8, 0.25, 1)', fill: 'forwards' });
}

function getResultHeadword(question) {
    if (typeof window.getTentenResultHeadword === 'function') {
        return window.getTentenResultHeadword(question);
    }
    if (!question) return '';
    return question.isGlobalData
        ? String(question.hanzi || question.reading || '')
        : String(question.reading || question.hanzi || '');
}

function getInQuizRevealSecondary(question) {
    if (typeof window.getTentenInQuizRevealSecondary === 'function') {
        return window.getTentenInQuizRevealSecondary(question);
    }
    const hiddenUntilResults = ['ja', 'zh-CN', 'zh-TW'].includes(String(question && question.learningLanguage));
    return hiddenUntilResults ? '' : getResultHeadword(question);
}

function hideAnswerRevealPopup() {
    const overlay = document.getElementById('answer-reveal-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function playAnswerRevealExit(onDone) {
    const overlay = document.getElementById('answer-reveal-overlay');
    const backdrop = document.getElementById('answer-reveal-backdrop');
    const card = document.getElementById('answer-reveal-card');

    if (!overlay || overlay.style.display === 'none' || !backdrop || !card) {
        if (typeof onDone === 'function') onDone();
        return;
    }

    backdrop.animate([
        { background: 'var(--reveal-overlay-visible)' },
        { background: 'var(--reveal-overlay-hidden)' }
    ], { duration: ANSWER_REVEAL_EXIT_MS, easing: 'ease-in', fill: 'forwards' });

    const exitAnim = card.animate([
        { transform: 'translateX(-50%) scale(1.03)', opacity: 1 },
        { transform: 'translateX(-50%) scale(0.985)', opacity: 0 }
    ], { duration: ANSWER_REVEAL_EXIT_MS, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });

    exitAnim.onfinish = () => {
        hideAnswerRevealPopup();
        if (typeof onDone === 'function') onDone();
    };
}

function cancelScheduledQuestionAdvance() {
    answerRevealAdvanceToken++;
    if (advanceQuestionTimeoutId) {
        clearTimeout(advanceQuestionTimeoutId);
        advanceQuestionTimeoutId = null;
    }
}

function scheduleAnswerRevealAdvance(answerAudioDone = Promise.resolve()) {
    cancelScheduledQuestionAdvance();
    const sequenceToken = answerRevealAdvanceToken;
    let revealTimeElapsed = false;
    let answerAudioFinished = false;
    let advancing = false;

    const advanceWhenReady = () => {
        if (
            advancing ||
            sequenceToken !== answerRevealAdvanceToken ||
            !revealTimeElapsed ||
            !answerAudioFinished
        ) {
            return;
        }
        advancing = true;
        playAnswerRevealExit(goToNextQuestion);
    };

    Promise.resolve(answerAudioDone)
        .catch(() => undefined)
        .then(() => {
            answerAudioFinished = true;
            advanceWhenReady();
        });

    advanceQuestionTimeoutId = setTimeout(() => {
        advanceQuestionTimeoutId = null;
        revealTimeElapsed = true;
        advanceWhenReady();
    }, Math.max(0, ANSWER_REVEAL_MS - ANSWER_REVEAL_EXIT_MS));
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getItemUniqueKey(item) {
    return `${item.hanzi}|${item.meaning}|${item.category}|${item.stage}`;
}

function getRandomIntInclusive(min, max) {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function takeRandomUniqueItems(source, count, usedKeySet) {
    if (!Array.isArray(source) || count <= 0) return [];

    const picked = [];
    const shuffled = shuffleArray([...source]);
    for (const item of shuffled) {
        const key = getItemUniqueKey(item);
        if (usedKeySet.has(key)) continue;
        usedKeySet.add(key);
        picked.push(item);
        if (picked.length >= count) break;
    }
    return picked;
}

function buildNearestStagePool(source, selectedStage, usedKeySet) {
    const byStage = new Map();
    source.forEach((item) => {
        const stage = Number(item.stage);
        if (!Number.isInteger(stage)) return;
        if (!byStage.has(stage)) byStage.set(stage, []);
        byStage.get(stage).push(item);
    });

    const ordered = [];
    for (let distance = 0; distance <= 9; distance++) {
        const lowerStage = selectedStage - distance;
        const higherStage = selectedStage + distance;

        if (lowerStage >= 1 && byStage.has(lowerStage)) {
            ordered.push(...shuffleArray([...byStage.get(lowerStage)]));
        }
        if (distance > 0 && higherStage <= 10 && byStage.has(higherStage)) {
            ordered.push(...shuffleArray([...byStage.get(higherStage)]));
        }
    }

    return ordered.filter((item) => !usedKeySet.has(getItemUniqueKey(item)));
}

async function prepareQuizSet() {
    const stage = window.selectedQuizCategory;
    const sectionKey = window.selectedQuizSection;

    let pool = [];
    const keepQuestionOrder = sectionKey === VIRTUAL_SECTION_DAILY;

    if (sectionKey === VIRTUAL_SECTION_DAILY) {
        const session = activeDailyQuizSession || await getOrCreateDailyQuizSession();
        activeDailyQuizSession = session;
        pool = session.questionKeys.map(findDailyQuizQuestion).filter(Boolean);
    } else if (sectionKey === VIRTUAL_SECTION_WRONG) {
        pool = await dbGetAllByStage(STORE_WRONG, stage);
    } else if (sectionKey === VIRTUAL_SECTION_WORDBOOK) {
        pool = await dbGetAllByStage(STORE_WORDBOOK, stage);
    } else {
        // 기존 로직 그대로 유지
        pool = activeQuizData.filter(item =>
            Number(item.stage) === Number(stage) &&
            (item.category === sectionKey || item.section === sectionKey)
        );
    }

    // 오답·단어장은 학습 언어별 DB에 보관하지만 뜻·설명·선택지는 저장 당시의
    // 사용자 언어일 수 있습니다. 음원 유무와 관계없이 현재 데이터와 다시 연결해
    // 사용자가 선택한 최신 인터페이스 언어로 항상 새로 표시합니다.
    pool = pool.map(reconnectStoredQuizItem).filter(Boolean);

    // 각 문제에 options/correct 없으면 생성 (기존 buildQuizDataFromSectionArrays 로직 재사용)
    // 섹션의 전체 문제를 섞은 뒤, 퀴즈 한 회당 최대 10문제만 출제합니다.
    if (!keepQuestionOrder) shuffleArray(pool);
    const quizPool = sectionKey === VIRTUAL_SECTION_WORDBOOK ? pool : pool.slice(0, QUIZ_QUESTION_LIMIT);

    shuffledQuestions = quizPool.map(item => {
        if (Array.isArray(item.options) && item.options.length >= 2 && Number.isInteger(item.correct)) {
            return item;
        }
        const distractorStage = Number(item.stage || stage);
        const distractorPool = typeof window.getTentenDistractorPool === 'function'
            ? window.getTentenDistractorPool(activeQuizData, item)
            : activeQuizData
                .filter((candidate) =>
                    Number(candidate.stage) === distractorStage &&
                    String(candidate.category || candidate.section || '') === String(item.category || item.section || '') &&
                    candidate.meaning !== item.meaning
                )
                .map((candidate) => candidate.meaning);
        shuffleInPlace(distractorPool);
        const options = [item.meaning, ...distractorPool.slice(0, 3)];
        shuffleArray(options);
        return { ...item, options, correct: options.indexOf(item.meaning) };
    });

    if (!keepQuestionOrder) shuffleArray(shuffledQuestions);
    TOTAL_QUESTIONS = shuffledQuestions.length;
}


function startQuestionTimer() {
    clearInterval(timerInterval);
    timeLeft = TIME_PER_QUESTION;
    updateTimerDisplay();

    startTimerLoop();
}

function startTimerLoop() {
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, 1000);
}

function resumeQuestionTimer() {
    clearInterval(timerInterval);
    startTimerLoop();
}

function setPauseButtonState(enabled) {
    const btn = document.getElementById('pause-toggle-btn');
    if (!btn) return;
    btn.disabled = !enabled;
}

function updatePauseButtonText() {
    const btn = document.getElementById('pause-toggle-btn');
    if (!btn) return;
    btn.innerText = isPaused ? uiT('resume') : uiT('pause');
}

function applyPauseVisual(paused) {
    const quizCard = document.getElementById('quiz-card');
    if (!quizCard) return;
    quizCard.classList.toggle('quiz-paused', paused);
}

function togglePauseMode() {
    if (isPaused) {
        isPaused = false;
        applyPauseVisual(false);
        updatePauseButtonText();

        if (isClickable) {
            const buttons = document.querySelectorAll('.option-btn');
            buttons.forEach((btn) => { btn.disabled = false; });

            if (timeLeft > 0) {
                resumeQuestionTimer();
            }
            if (currentHanzi) {
                startAutoRepeatSound(currentHanzi);
            }
        }
        return;
    }

    if (!isClickable) return;

    isPaused = true;
    clearInterval(timerInterval);
    stopAutoRepeatSound();

    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn) => { btn.disabled = true; });

    applyPauseVisual(true);
    updatePauseButtonText();
}

function resetPauseMode() {
    isPaused = false;
    clearInterval(timerInterval);
    applyPauseVisual(false);
    updatePauseButtonText();
    setPauseButtonState(false);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('timer-display');
    timerEl.innerText = uiT('seconds', { seconds: timeLeft });
    if (timeLeft <= 3) {
        timerEl.classList.add('timer-warning');
    } else {
        timerEl.classList.remove('timer-warning');
    }
}

function ensureSectionBadge() {
    if (document.getElementById('section-badge')) return;

    const quizCard = document.getElementById('quiz-card');
    if (!quizCard) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'section-badge-wrap';

    const badge = document.createElement('div');
    badge.id = 'section-badge';
    badge.className = 'section-badge';

    wrapper.appendChild(badge);
    quizCard.insertBefore(wrapper, quizCard.firstChild);
}

function updateSectionBadge() {
    ensureSectionBadge();
}

function startAutoRepeatSound(term) {
    if (!isSoundEnabled) return;

    stopAutoRepeatSound();
    audioPlayToken++;
    const myToken = audioPlayToken;
    isAutoRepeating = true;
    playRepeatOnce(term, myToken, currentQuizItem);
}

function playRepeatOnce(term, token, quizItem = null) {
    if (!isAutoRepeating || token !== audioPlayToken || !term) return;

    if (timeLeft <= AUTO_REPEAT_STOP_THRESHOLD) {
        isAutoRepeating = false;
        return;
    }

    playPronunciationAudio(term, quizItem, { repeatMode: true, token });
}

function stopAutoRepeatSound() {
    isAutoRepeating = false;
    audioPlayToken++;
    if (cancelPendingNativeAnswerAudio) {
        const cancelAnswerAudio = cancelPendingNativeAnswerAudio;
        cancelPendingNativeAnswerAudio = null;
        cancelAnswerAudio();
    }
    if (autoRepeatTimeoutId) {
        clearTimeout(autoRepeatTimeoutId);
        autoRepeatTimeoutId = null;
    }
    if (currentAudio) {
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
}

function updateSoundToggleButton() {
    const button = document.getElementById('speak-btn');
    if (!button) return;

    const audioUnavailable = Boolean(currentQuizItem && currentQuizItem.isGlobalData && !currentQuizItem.audioFile);
    button.hidden = audioUnavailable;
    button.disabled = audioUnavailable;
    if (audioUnavailable) {
        button.setAttribute('aria-label', uiT('soundPreparing'));
        button.title = uiT('soundPreparing');
        return;
    }

    button.innerText = isSoundEnabled ? '🔊' : '🔇';
    button.setAttribute('aria-label', isSoundEnabled ? uiT('soundOn') : uiT('soundOff'));
    button.setAttribute('aria-pressed', String(isSoundEnabled));
    button.title = isSoundEnabled ? uiT('soundOn') : uiT('soundOff');
    button.classList.toggle('sound-off', !isSoundEnabled);
    button.classList.toggle('sound-on', isSoundEnabled);
}

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    updateSoundToggleButton();

    if (!isSoundEnabled) {
        stopAutoRepeatSound();
        return;
    }

    const quizCard = document.getElementById('quiz-card');
    const quizIsVisible = quizCard && quizCard.style.display !== 'none';
    if (quizIsVisible && isClickable && !isPaused && currentHanzi) {
        startAutoRepeatSound(currentHanzi);
    }
}

function stopActiveQuizFlow() {
    const quizReturnWrap = document.querySelector('.quiz-section-return-wrap');

    cancelScheduledQuestionAdvance();

    clearInterval(timerInterval);
    timerInterval = null;

    if (hanziRevealTimer) {
        clearTimeout(hanziRevealTimer);
        hanziRevealTimer = null;
    }

    stopAutoRepeatSound();
    hideAnswerRevealPopup();

    isClickable = false;
    isPaused = false;
    applyPauseVisual(false);
    updatePauseButtonText();
    setPauseButtonState(false);

    currentHanzi = "";
    currentQuizItem = null;
    currentCorrectText = "";

    currentIdx = 0;
    score = 0;
    wrongAnswers = [];
    correctAnswers = [];
    excludedTimeMs = 0;

    if (quizReturnWrap) {
        quizReturnWrap.style.display = 'none';
    }

    updateSoundToggleButton();
}

async function recordQuestionAsLearned(question) {
    if (!question || isSpecialReviewSection()) return;
    if (typeof markQuestionLearned !== 'function') return;

    try {
        const wasNewlyLearned = await markQuestionLearned(question);
        if (!wasNewlyLearned || typeof getLearningProgressByStage !== 'function') return;

        const stage = Number(question.stage || window.selectedQuizCategory || 1);
        const section = String(question.category || question.section || '');
        const sectionQuestions = getUniqueSectionQuestions(stage, section);
        if (sectionQuestions.length !== 25) return;

        const learnedRecords = await getLearningProgressByStage(stage);
        const learnedIds = new Set(learnedRecords.map((item) => item.id));
        const learnedCount = sectionQuestions.reduce(
            (count, item) => count + (learnedIds.has(getQuestionProgressId(item)) ? 1 : 0),
            0
        );
        if (learnedCount !== sectionQuestions.length) return;

        window.dispatchEvent(new CustomEvent('tenten-section-completed', {
            detail: {
                nativeLanguage: String((window.tentenGlobal && window.tentenGlobal.interfaceLanguage) || ''),
                learningLanguage: String((window.tentenGlobal && window.tentenGlobal.learningLanguage) || ''),
                stage,
                section,
                questionCount: sectionQuestions.length
            }
        }));
    } catch (error) {
        console.error('학습 진행 기록 저장 실패:', error);
    }
}

async function handleTimeout() {
    if (isPaused) return;
    if (!isClickable) return;
    isClickable = false;

    stopAutoRepeatSound();

    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn) => {
        btn.disabled = true;
        btn.classList.add('answer-reveal-dim');
        if (btn.getAttribute('data-text') === currentCorrectText) {
            btn.classList.add('correct');
        }
    });

    const q = shuffledQuestions[currentIdx];
    updateWordbookSessionStreak(q, false, currentCorrectText);
    showAnswerRevealPopup(currentCorrectText);
    const answerAudioDone = playNativeAnswerAudio(q);
    await recordQuestionAsLearned(q);
    const stage = q.stage || window.selectedQuizCategory || 1;
    const hanzi = getResultHeadword(q);
    const wrongItem = {
        id: q.id || '',
        hanzi,
        kanji: q.kanji || '',
        reading: q.reading,
        pinyin: q.pinyin,
        meaning: currentCorrectText,
        example: q.example || "",
        exampleTrans: q.exampleTrans || "",
        note: q.note || "",
        audioFile: q.audioFile || "",
        answerAudioFile: q.answerAudioFile || "",
        isGlobalData: Boolean(q.isGlobalData),
        learningLanguage: q.learningLanguage || '',
        interfaceLanguage: q.interfaceLanguage || '',
        stage,
        category: q.category || '',
        timeout: true
    };

    wrongAnswers.push(wrongItem);

    // 시간초과도 일반 오답과 동일하게 해당 스테이지의 오답 클리어하기에 저장합니다.
    try {
        await addOrUpdateWrong(wrongItem);
        if (window.selectedQuizSection === VIRTUAL_SECTION_WRONG) {
            await updateInQuizWrongBadge();
        }
    } catch (error) {
        console.error('시간초과 오답 저장 실패:', error);
    }

    recordDailyQuizAttemptResult(q, 'timeout');

    excludedTimeMs += ANSWER_REVEAL_MS;

    scheduleAnswerRevealAdvance(answerAudioDone);
}

function loadQuiz() {
    isClickable = true;
    isPaused = false;
    applyPauseVisual(false);
    updatePauseButtonText();
    setPauseButtonState(true);
    updateSoundToggleButton();

    hideAnswerRevealPopup();

    timeLeft = TIME_PER_QUESTION;

    const currentQuiz = shuffledQuestions[currentIdx];

    currentHanzi = currentQuiz.reading || currentQuiz.hanzi;
    currentQuizItem = currentQuiz;
    updateSoundToggleButton();


    document.getElementById('progress-text').innerText = uiT('questionProgress', {
        current: currentIdx + 1,
        total: TOTAL_QUESTIONS
    });

    ensureSectionBadge();
    const sectionBadgeEl = document.getElementById('section-badge');

    if (hanziRevealTimer) {
        clearTimeout(hanziRevealTimer);
        hanziRevealTimer = null;
    }

    if (sectionBadgeEl) {
        sectionBadgeEl.style.display = 'none';
    }

    const displayPronunciation = currentQuiz.pinyin || '';
    const customFocusKeywords = Array.isArray(currentQuiz.focusKeywords)
        ? currentQuiz.focusKeywords
        : (currentQuiz.focusKeywords ? [currentQuiz.focusKeywords] : []);

    let displayOptions = [...currentQuiz.options];
    for (let i = displayOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [displayOptions[i], displayOptions[j]] = [displayOptions[j], displayOptions[i]];
    }
    const displayOptionLabels = buildQuizOptionLabels(displayOptions);

    const isFourChoice = displayOptions.length === 4;
    const optionContrast = isFourChoice ? analyzeOptionContrast(displayOptions) : null;
    const pinyinWithFocus = highlightPinyinFocus(displayPronunciation, currentQuiz.focusPinyin || '', optionContrast);
    document.getElementById('pinyin').innerHTML = `
        <div class="quiz-pinyin-main">${pinyinWithFocus}</div>
    `;

    startAutoRepeatSound(currentQuiz.reading || currentQuiz.hanzi);

    currentCorrectText = currentQuiz.options[currentQuiz.correct];

    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn, index) => {
        if (btn && displayOptions[index]) {
            const optionLabel = displayOptionLabels[index] || displayOptions[index];
            btn.innerHTML = highlightOptionFocus(optionLabel, customFocusKeywords, optionContrast, isFourChoice);
            btn.className = 'option-btn';
            btn.disabled = false;
            btn.setAttribute('data-text', displayOptions[index]);
        }
    });

    scheduleOptionButtonHeightSync();
    updateStreakDotsForCurrentQuestion();
}

async function updateInQuizWrongBadge() {
    try {
        const selectedStage = window.selectedQuizCategory || getDefaultStageKey();
        const wrongCount = await getWrongBankCountByStage(selectedStage);
        
        const wrongBadge = document.querySelector('.wrong-bank-section-btn .section-count-badge');
        if (wrongBadge) {
            wrongBadge.textContent = uiT('count', { count: wrongCount });
            wrongBadge.className = `section-count-badge ${wrongCount > 0 ? 'has-count' : 'zero-count'}`;
        }
    } catch (error) {
        console.error('updateInQuizWrongBadge 에러:', error);
    }
}

async function updateStreakDotsForCurrentQuestion() {
    const dotRow = document.getElementById('streak-dot-row');
    if (!dotRow) return;
    dotRow.innerHTML = '';
    dotRow.style.display = 'none';
}

let optionHeightSyncRafId = 0;

function normalizeOptionButtonHeights() {
    const buttons = Array.from(document.querySelectorAll('.option-btn'))
        .filter((btn) => btn.getAttribute('data-text'));

    if (!buttons.length) return;

    // 먼저 auto로 되돌린 뒤 가장 큰 높이를 기준으로 통일한다.
    buttons.forEach((btn) => {
        btn.style.height = 'auto';
    });

    const maxHeight = Math.max(...buttons.map((btn) => btn.offsetHeight));
    if (!Number.isFinite(maxHeight) || maxHeight <= 0) return;

    buttons.forEach((btn) => {
        btn.style.height = `${maxHeight}px`;
    });
}

function scheduleOptionButtonHeightSync() {
    if (optionHeightSyncRafId) {
        cancelAnimationFrame(optionHeightSyncRafId);
    }

    // DOM 반영과 폰트 레이아웃 타이밍을 고려해 2프레임 뒤 동기화한다.
    optionHeightSyncRafId = requestAnimationFrame(() => {
        optionHeightSyncRafId = requestAnimationFrame(() => {
            normalizeOptionButtonHeights();
            optionHeightSyncRafId = 0;
        });
    });
}

async function checkAnswer(selectedIdx) {
    if (isPaused) return;
    if (!isClickable) return;
    isClickable = false;

    clearInterval(timerInterval);
    stopAutoRepeatSound();

    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn) => { btn.disabled = true; });

    const selectedButton = buttons[selectedIdx];
    const selectedText = selectedButton.getAttribute('data-text');

    const q = shuffledQuestions[currentIdx];
    await recordQuestionAsLearned(q);
    const stage = q.stage || window.selectedQuizCategory || 1;
    const hanzi = getResultHeadword(q);

    if (selectedText === currentCorrectText) {
        updateWordbookSessionStreak(q, true, currentCorrectText);
        selectedButton.classList.add('correct');
        score++;

        correctAnswers.push({
            id: q.id || '',
            hanzi, kanji: q.kanji || '', reading: q.reading, pinyin: q.pinyin,
            meaning: currentCorrectText,
            example: q.example || "", exampleTrans: q.exampleTrans || "", note: q.note || "", audioFile: q.audioFile || "", answerAudioFile: q.answerAudioFile || "",
            isGlobalData: Boolean(q.isGlobalData), learningLanguage: q.learningLanguage || '', interfaceLanguage: q.interfaceLanguage || '',
            stage, category: q.category || ''
        });

        // 오답 클리어하기에서 맞힌 경우에만 해당 오답을 클리어합니다.
        const result = [VIRTUAL_SECTION_WRONG, VIRTUAL_SECTION_DAILY].includes(window.selectedQuizSection)
            ? await handleCorrectForWrongBank(stage, hanzi, currentCorrectText, q.id || '')
            : null;
        if (result && window.selectedQuizSection === VIRTUAL_SECTION_WRONG) {
            burstWrongClearConfetti();
            // 현재 섹션이 오답 클리어하기라면 배지 숫자도 즉시 갱신
            if (window.selectedQuizSection === VIRTUAL_SECTION_WRONG) {
                await updateInQuizWrongBadge();
            }
        }

        recordDailyQuizAttemptResult(q, 'correct');

        advanceQuestionTimeoutId = setTimeout(() => {
            advanceQuestionTimeoutId = null;
            goToNextQuestion();
        }, 450);

    } else {
        updateWordbookSessionStreak(q, false, currentCorrectText);
        selectedButton.classList.add('wrong');
        buttons.forEach((btn) => {
            btn.classList.add('answer-reveal-dim');
            if (btn.getAttribute('data-text') === currentCorrectText) {
                btn.classList.add('correct');
            }
        });
        showAnswerRevealPopup(currentCorrectText);
        const answerAudioDone = playNativeAnswerAudio(q);

        wrongAnswers.push({
            id: q.id || '',
            hanzi, kanji: q.kanji || '', reading: q.reading, pinyin: q.pinyin,
            meaning: currentCorrectText,
            example: q.example || "", exampleTrans: q.exampleTrans || "", note: q.note || "", audioFile: q.audioFile || "", answerAudioFile: q.answerAudioFile || "",
            isGlobalData: Boolean(q.isGlobalData), learningLanguage: q.learningLanguage || '', interfaceLanguage: q.interfaceLanguage || '',
            stage, category: q.category || ''
        });

        // ★★★ 오답은행에 새로 추가 or 스트릭 초기화 ★★★
        await addOrUpdateWrong({
            id: q.id || '',
            hanzi, kanji: q.kanji || '', reading: q.reading, pinyin: q.pinyin,
            meaning: currentCorrectText,
            example: q.example || "", exampleTrans: q.exampleTrans || "", note: q.note || "", audioFile: q.audioFile || "", answerAudioFile: q.answerAudioFile || "",
            isGlobalData: Boolean(q.isGlobalData), learningLanguage: q.learningLanguage || '', interfaceLanguage: q.interfaceLanguage || '',
            stage, category: q.category || ''
        });

        if (window.selectedQuizSection === VIRTUAL_SECTION_WRONG) {
            await updateInQuizWrongBadge();
        }

        recordDailyQuizAttemptResult(q, 'wrong');

        excludedTimeMs += ANSWER_REVEAL_MS;
        scheduleAnswerRevealAdvance(answerAudioDone);
    }
}


function goToNextQuestion() {
    cancelScheduledQuestionAdvance();

    currentIdx++;
    if (currentIdx >= TOTAL_QUESTIONS) {
        if (window.selectedQuizSection === VIRTUAL_SECTION_WORDBOOK) {
            currentIdx = 0;
            shuffleArray(shuffledQuestions);
            loadQuiz();
            startQuestionTimer();
            return;
        }
        endGame();
        return;
    }
    loadQuiz();
    startQuestionTimer();
}

function finishWordbookLearning() {
    cancelScheduledQuestionAdvance();
    clearInterval(timerInterval);
    endGame();
}

function endGame() {
    isClickable = false;
    resetPauseMode();
    stopAutoRepeatSound();
    hideAnswerRevealPopup();

    quizEndTime = Date.now();

    const rawElapsedMs = (quizEndTime - quizStartTime) - excludedTimeMs;
    const elapsedSeconds = (Math.max(0, rawElapsedMs) / 1000).toFixed(2);
    finalTotalTimeText = elapsedSeconds;

    const renderToken = ++wordbookResultRenderToken;
    const staleWordbookPanel = document.getElementById('wordbook-learning-result');
    if (staleWordbookPanel) staleWordbookPanel.remove();

    document.getElementById('quiz-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'block';
    const resultTitle = document.querySelector('#result-card h2');
    if (resultTitle) {
        resultTitle.textContent = quizSessionMode === VIRTUAL_SECTION_WORDBOOK
            ? `⭐ ${uiT('myWordbook')}`
            : quizSessionMode === VIRTUAL_SECTION_DAILY
                ? uiT('dailyQuizResultTitle')
                : uiT('quizComplete');
    }
    const quizReturnWrap = document.querySelector('.quiz-section-return-wrap');
    if (quizReturnWrap) {
        quizReturnWrap.style.display = 'none';
    }
    updateSectionTopicText();
    completeDailyQuizAttempt(score);
    updateResultActionButtons();

    document.getElementById('score-text').innerText = score;

    // ★★★ 복구된 줄: 백업본에 있던 오답 개수 표시 코드 (원래 삭제되어 있었음) ★★★
    const wrongCountEl = document.getElementById('wrong-count-text');
    if (wrongCountEl) {
        wrongCountEl.innerText = wrongAnswers.length;
    }

    const resultTimeLine = document.getElementById('result-time-line');
    if (resultTimeLine) resultTimeLine.textContent = uiT('elapsed', { time: elapsedSeconds });

    showPerfectScoreCelebration(score);

    const wrongContainer = document.getElementById('wrong-answers-container');
    const wrongListDiv = document.getElementById('wrong-list');
    if (wrongAnswers.length > 0) {
        wrongListDiv.innerHTML = "";
        wrongAnswers.forEach((item) => {
            const itemParagraph = document.createElement('div');
            itemParagraph.className = 'wrong-item';

            const examplePinyin = getSentencePinyin(item.example);
            const noteWithPinyin = pinyinizeNote(item.note);
            const timeoutTag = item.timeout ? ` <span class="timeout-tag">(⏰${escapeHtml(uiT('timeout'))})</span>` : "";
            const hasExampleBlock = Boolean(item.example || examplePinyin || item.exampleTrans);
            const noteDivider = item.note && hasExampleBlock ? `<div class="note-example-divider"></div>` : "";
            const resultReading = String(item.reading || item.pinyin || '').trim();
            const pronunciationBracket = resultReading && resultReading.toLocaleLowerCase() !== String(item.hanzi || '').trim().toLocaleLowerCase()
                ? `[${escapeHtml(resultReading)}]`
                : '';
            const speakValue = escapeHtml(item.reading || item.hanzi);
            const speakSection = escapeHtml(item.category || item.section || '');
            const speakAudioFile = escapeHtml(item.audioFile || '');
            const exampleSpeakValue = escapeHtml(item.hanzi);
            const wordSpeakButton = item.audioFile
                ? `<button class="note-speak-btn js-action-note-speak-word" type="button" data-hanzi="${speakValue}" data-section="${speakSection}" data-audio-file="${speakAudioFile}">🔊</button>`
                : '';

            itemParagraph.innerHTML = `
                📍 <span class="wrong-pinyin">${escapeHtml(item.hanzi)} ${pronunciationBracket}</span> ➜ <span class="wrong-meaning">${escapeHtml(item.meaning)}</span>${timeoutTag} ${wordSpeakButton}
                ${item.note ? `<div class="word-note-text">📝 ${noteWithPinyin}</div>` : ""}
                ${noteDivider}
                ${item.example ? `<div class="wrong-example">💬 ${escapeHtmlWithLineBreaks(item.example)} <button class="note-speak-btn example-speak-btn js-action-note-speak-example" type="button" data-hanzi="${exampleSpeakValue}" aria-label="예문 오디오 재생" title="예문 듣기">🔊</button></div>` : ""}
                ${examplePinyin ? `<div class="wrong-example-pinyin">[${examplePinyin}]</div>` : ""}
                ${item.exampleTrans ? `<div class="wrong-example-trans">→ ${escapeHtmlWithLineBreaks(item.exampleTrans)}</div>` : ""}
                
                <!-- ↙️ 틀린 단어 줄 맨 아래에 단어장 버튼 HTML 추가 -->
                ${buildWordbookButtonHtml(item)}
            `;
            wrongListDiv.appendChild(itemParagraph);
        });
        wrongContainer.style.display = 'block';
    } else {
        wrongContainer.style.display = 'none';
    }

    const correctContainer = document.getElementById('correct-answers-container');
    const correctListDiv = document.getElementById('correct-list');
    if (correctAnswers.length > 0) {
        correctListDiv.innerHTML = "";
        correctAnswers.forEach((item) => {
            const itemParagraph = document.createElement('div');
            itemParagraph.className = 'wrong-item';

            const examplePinyin = getSentencePinyin(item.example);
            const noteWithPinyin = pinyinizeNote(item.note);
            const hasExampleBlock = Boolean(item.example || examplePinyin || item.exampleTrans);
            const noteDivider = item.note && hasExampleBlock ? `<div class="note-example-divider"></div>` : "";
            const resultReading = String(item.reading || item.pinyin || '').trim();
            const pronunciationBracket = resultReading && resultReading.toLocaleLowerCase() !== String(item.hanzi || '').trim().toLocaleLowerCase()
                ? `[${escapeHtml(resultReading)}]`
                : '';
            const speakValue = escapeHtml(item.reading || item.hanzi);
            const speakSection = escapeHtml(item.category || item.section || '');
            const speakAudioFile = escapeHtml(item.audioFile || '');
            const exampleSpeakValue = escapeHtml(item.hanzi);
            const wordSpeakButton = item.audioFile
                ? `<button class="note-speak-btn js-action-note-speak-word" type="button" data-hanzi="${speakValue}" data-section="${speakSection}" data-audio-file="${speakAudioFile}">🔊</button>`
                : '';

            itemParagraph.innerHTML = `
                ✅ <span class="wrong-pinyin correct-item-pinyin">${escapeHtml(item.hanzi)} ${pronunciationBracket}</span> ➜ <span class="wrong-meaning">${escapeHtml(item.meaning)}</span> ${wordSpeakButton}
                ${item.note ? `<div class="word-note-text">📝 ${noteWithPinyin}</div>` : ""}
                ${noteDivider}
                ${item.example ? `<div class="wrong-example">💬 ${escapeHtmlWithLineBreaks(item.example)} <button class="note-speak-btn example-speak-btn js-action-note-speak-example" type="button" data-hanzi="${exampleSpeakValue}" aria-label="예문 오디오 재생" title="예문 듣기">🔊</button></div>` : ""}
                ${examplePinyin ? `<div class="wrong-example-pinyin">[${examplePinyin}]</div>` : ""}
                ${item.exampleTrans ? `<div class="wrong-example-trans">→ ${escapeHtmlWithLineBreaks(item.exampleTrans)}</div>` : ""}
                
                <!-- ↙️ 맞힌 단어 줄 맨 아래에 단어장 버튼 HTML 추가 -->
                ${buildWordbookButtonHtml(item)}
            `;
            correctListDiv.appendChild(itemParagraph);
        });
        correctContainer.style.display = 'block';
    } else {
        correctContainer.style.display = 'none';
    }

    syncWordbookButtons();
    if (quizSessionMode === VIRTUAL_SECTION_WORDBOOK) void renderWordbookLearningResult(quizSessionCategory, renderToken);
}


async function restartQuiz() {
    quizSessionMode = window.selectedQuizSection;
    quizSessionCategory = window.selectedQuizCategory;
    wordbookResultRenderToken++;
    const staleWordbookPanel = document.getElementById('wordbook-learning-result');
    if (staleWordbookPanel) staleWordbookPanel.remove();

    score = 0;
    currentIdx = 0;
    wrongAnswers = [];
    correctAnswers = [];
    isClickable = false;
    excludedTimeMs = 0;
    wordbookSessionStreaks = new Map();

    stopAutoRepeatSound();
    hideAnswerRevealPopup();
    isPaused = false;
    applyPauseVisual(false);
    updatePauseButtonText();
    setPauseButtonState(true);

    resetPerfectScoreCelebration();

    updateSectionTopicText();

    await updateSectionBadge();

    await prepareQuizSet();

    restoreDailyQuizAttempt();

    if (TOTAL_QUESTIONS === 0) {
        const sectionKey = window.selectedQuizSection;
        const emptyMessage = sectionKey === VIRTUAL_SECTION_WRONG
            ? uiT('noWrongAnswers')
            : sectionKey === VIRTUAL_SECTION_WORDBOOK
                ? uiT('noWordbookWords')
                : uiT('noQuestions');

        stopActiveQuizFlow();
        showStreakToast(emptyMessage, sectionKey === VIRTUAL_SECTION_WRONG);

        const quizCard = document.getElementById('quiz-card');
        const resultCard = document.getElementById('result-card');
        if (quizCard) quizCard.style.display = 'none';
        if (resultCard) resultCard.style.display = 'none';

        if (typeof goToSameSectionFromResult === 'function') {
            goToSameSectionFromResult();
        } else if (typeof goToSameSectionFromQuiz === 'function') {
            goToSameSectionFromQuiz();
        }
        return;
    }

    const resultCard = document.getElementById('result-card');
    const quizCard = document.getElementById('quiz-card');
    const quizReturnWrap = document.querySelector('.quiz-section-return-wrap');
    if (resultCard) resultCard.style.display = 'none';
    if (quizCard) quizCard.style.display = 'block';
    if (quizReturnWrap) quizReturnWrap.style.display = 'block';
    const quizReturnButton = document.querySelector('.js-action-quiz-back-section');
    if (quizReturnButton) {
        quizReturnButton.textContent = quizSessionMode === VIRTUAL_SECTION_WORDBOOK
            ? uiT('finishLearning')
            : quizSessionMode === VIRTUAL_SECTION_DAILY
                ? uiT('backToStages')
                : uiT('backToSections');
    }

    quizStartTime = Date.now();

    loadQuiz();
    startQuestionTimer();
}

function fallbackCopyShareText(text) {
    const dummyInput = document.createElement('textarea');
    dummyInput.style.position = 'fixed';
    dummyInput.style.opacity = '0';
    document.body.appendChild(dummyInput);
    dummyInput.value = text;
    dummyInput.select();
    document.execCommand('copy');
    document.body.removeChild(dummyInput);
}

async function copyShareText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch (error) {
            console.warn('Clipboard API failed; using fallback copy.', error);
        }
    }
    fallbackCopyShareText(text);
}

function buildCleanShareUrl() {
    const canonicalHref = document.querySelector('link[rel="canonical"]')?.href;
    const url = new URL(canonicalHref || window.location.href);
    const learningLanguage = String(window.tentenGlobal?.learningLanguage || '').trim();

    if (learningLanguage) url.searchParams.set('learn', learningLanguage);
    if (learningLanguage === 'zh-CN' || learningLanguage === 'zh-TW') {
        const chineseReading = window.tentenGlobal?.chineseReading === 'zhuyin' ? 'zhuyin' : 'pinyin';
        url.searchParams.set('zhReading', chineseReading);
    } else {
        url.searchParams.delete('zhReading');
    }

    url.searchParams.delete('native');
    url.hash = '';
    return url.toString();
}

async function shareOrCopy(title, body, includeChallenge = true) {
    const shareUrl = buildCleanShareUrl();
    if (navigator.share) {
        try {
            await navigator.share({ title, text: body, url: shareUrl });
            return;
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            console.warn('Web Share API failed; copying instead.', error);
        }
    }

    const challengeLine = includeChallenge ? `\n\n${uiT('challenge')}` : '';
    await copyShareText(`${title}\n\n${body}${challengeLine}\n${shareUrl}`);
    alert(uiT('copied'));
}

function getLearningLanguageLabel() {
    if (!window.tentenGlobal || typeof window.getTentenLanguage !== 'function') return '';
    return window.getTentenLanguage(window.tentenGlobal.learningLanguage).label;
}

async function copyScoreToClipboard() {
    const title = uiT('shareTitle', { language: getLearningLanguageLabel() });
    const body = uiT('shareResultMessage', {
        total: TOTAL_QUESTIONS,
        time: finalTotalTimeText,
        score
    });
    await shareOrCopy(title, body, false);
}

function shareToKakao() {
    return copyScoreToClipboard();
}

async function shareNotesToKakao() {
    const title = `${uiT('shareTitle', { language: getLearningLanguageLabel() })} · ${uiT('shareNotesTitle')}`;
    let body = '';

    if (wrongAnswers.length > 0) {
        body += `${uiT('wrongNotes')}\n`;
        wrongAnswers.forEach((item) => {
            const reading = String(item.reading || item.pinyin || '').trim();
            const readingText = reading && reading.toLocaleLowerCase() !== String(item.hanzi || '').trim().toLocaleLowerCase()
                ? ` [${reading}]`
                : '';
            body += `- ${item.hanzi}${readingText} : ${item.meaning}\n`;
            if (item.note) body += `  · ${uiT('noteLabel')}: ${item.note}\n`;
        });
        body += '\n';
    }

    if (correctAnswers.length > 0) {
        body += `${uiT('correctNotes')}\n`;
        correctAnswers.forEach((item) => {
            const reading = String(item.reading || item.pinyin || '').trim();
            const readingText = reading && reading.toLocaleLowerCase() !== String(item.hanzi || '').trim().toLocaleLowerCase()
                ? ` [${reading}]`
                : '';
            body += `- ${item.hanzi}${readingText} : ${item.meaning}\n`;
            if (item.note) body += `  · ${uiT('noteLabel')}: ${item.note}\n`;
        });
    }

    await shareOrCopy(title, body.trim());
}

function getSentencePinyin(sentence) {
    const key = String(sentence || '').trim();
    if (!key) return "";
    return examplePinyinMap[key] || "";
}

function pinyinizeNote(note) {
    if (!note) return "";
    return note;
}

function speakChinese(hanzi, section = '', audioFile = '') {
    if (!hanzi) return;

    stopAutoRepeatSound();
    const quizItem = section || audioFile ? { category: section, audioFile } : null;
    playPronunciationAudio(hanzi, quizItem, { repeatMode: false, token: audioPlayToken });
}

function speakExample(hanzi) {
    if (!hanzi) return;

    stopAutoRepeatSound();
    playDialogueAudio(hanzi, null);
}

function playCurrentSound() {
    if (!currentHanzi) return;

    stopAutoRepeatSound();
    playPronunciationAudio(currentHanzi, currentQuizItem, { repeatMode: false, token: audioPlayToken });
}

let audioUnlocked = false;
async function unlockAudio(sectionKey = '', stage = 1) {
    if (audioUnlocked) return;

    try {
        const unlockItem = activeQuizData.find((item) =>
            Number(item.stage) === Number(stage) &&
            String(item.section || item.category || '') === String(sectionKey)
        ) || activeQuizData[0];

        if (!unlockItem) return;

        const candidates = getPronunciationAudioCandidates(
            unlockItem.reading || unlockItem.hanzi,
            unlockItem
        );
        if (!candidates.length) return;

        const unlockPlayer = new Audio();
        currentAudio = unlockPlayer;
        unlockPlayer.preload = 'auto';
        unlockPlayer.volume = 0.01;
        unlockPlayer.src = resolveTentenAssetUrl(candidates[0]);

        await unlockPlayer.play();
        audioUnlocked = true;
        unlockPlayer.pause();
        unlockPlayer.currentTime = 0;
    } catch (e) {
        console.warn('오디오 잠금 해제 실패:', e);
    }
}

function toggleAcc(button) {
    const panel = button.nextElementSibling;
    if (!panel || !panel.classList.contains('acc-panel')) return;
    const shouldOpen = button.getAttribute('aria-expanded') !== 'true';

    document.querySelectorAll('.info-accordion .acc-toggle').forEach((btn) => {
        const controlledPanel = btn.nextElementSibling;
        btn.classList.remove('acc-active');
        btn.setAttribute('aria-expanded', 'false');
        if (controlledPanel?.classList.contains('acc-panel')) {
            controlledPanel.classList.remove('open');
            controlledPanel.setAttribute('aria-hidden', 'true');
        }
    });

    if (shouldOpen) {
        button.classList.add('acc-active');
        button.setAttribute('aria-expanded', 'true');
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
    }
}

window.addEventListener('resize', () => {
    scheduleOptionButtonHeightSync();
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeQuizApp, { once: true });
} else {
    initializeQuizApp();
}

updateSoundToggleButton();

function burstWrongClearConfetti() {
    if (typeof confetti !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const optionsEl = document.querySelector('.options-container');
    if (!optionsEl) return;

    const rect = optionsEl.getBoundingClientRect();
    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 1);
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 1);

    confetti({
        particleCount: 65,
        spread: 82,
        startVelocity: 32,
        scalar: 0.78,
        ticks: 180,
        gravity: 0.82,
        disableForReducedMotion: true,
        origin: {
            x: Math.min(0.96, Math.max(0.04, (rect.left + rect.width / 2) / viewportWidth)),
            y: Math.min(0.92, Math.max(0.08, (rect.top - 8) / viewportHeight))
        }
    });
}

function showStreakToast(message, isCleared, options = {}) {
    let toast = document.getElementById('streak-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'streak-toast';
        document.body.appendChild(toast);
    }

    if (toast.hideTimerId) clearTimeout(toast.hideTimerId);
    if (toast.removeTimerId) clearTimeout(toast.removeTimerId);

    const showAtQuizTop = Boolean(options.quizTop);
    toast.className = `${isCleared ? 'streak-toast cleared' : 'streak-toast progress'}${showAtQuizTop ? ' quiz-top-celebration' : ''}`;
    toast.textContent = message;

    if (showAtQuizTop) {
        const quizCard = document.getElementById('quiz-card');
        const quizRect = quizCard ? quizCard.getBoundingClientRect() : null;
        toast.style.top = `${Math.max(14, (quizRect ? quizRect.top : 100) + 18)}px`;
        toast.style.bottom = 'auto';
    } else {
        toast.style.top = '';
        toast.style.bottom = '';
    }

    toast.style.display = 'block';
    toast.style.opacity = '1';

    const visibleDuration = showAtQuizTop ? 1300 : 1600;
    toast.hideTimerId = setTimeout(() => {
        toast.style.opacity = '0';
        toast.removeTimerId = setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, visibleDuration);
}
// endGame() 안, wrongListDiv.appendChild(itemParagraph) 직전에
// itemParagraph.innerHTML 마지막에 아래 버튼 HTML을 추가

async function renderWordbookLearningResult(sessionCategory, renderToken) {
    const resultCard = document.getElementById('result-card');
    if (!resultCard) return;
    document.getElementById('wrong-answers-container').style.display = 'none';
    document.getElementById('correct-answers-container').style.display = 'none';

    const oldPanel = document.getElementById('wordbook-learning-result');
    if (oldPanel) oldPanel.remove();
    const items = await dbGetAllByStage(STORE_WORDBOOK, sessionCategory);
    if (renderToken !== wordbookResultRenderToken || quizSessionMode !== VIRTUAL_SECTION_WORDBOOK) return;
    const graduates = items.filter((item) => (wordbookSessionStreaks.get(makeItemId(item.stage, item.reading || item.hanzi || '', item.meaning)) || 0) >= 3);
    const makeRows = (list) => list.length ? list.map((item) => `
        <div class="wordbook-result-row">
            <div><strong>${escapeHtml(item.meaning)}</strong><small>${escapeHtml(item.hanzi || '')}${item.reading && String(item.reading).toLocaleLowerCase() !== String(item.hanzi || '').toLocaleLowerCase() ? ` · ${escapeHtml(item.reading)}` : ''}</small></div>
            ${buildWordbookButtonHtml(item)}
        </div>`).join('') : `<p class="wordbook-empty-message">${escapeHtml(uiT('wordbookEmpty'))}</p>`;

    const panel = document.createElement('div');
    panel.id = 'wordbook-learning-result';
    panel.className = 'wordbook-learning-result';
    panel.innerHTML = `
        <details><summary>${escapeHtml(uiT('graduationCandidates'))} <b>${escapeHtml(uiT('count', { count: graduates.length }))}</b></summary><p class="wordbook-result-help">${escapeHtml(uiT('learnedThree'))}</p>${makeRows(graduates)}</details>
        <details><summary>${escapeHtml(uiT('wordbookAll'))} <b>${escapeHtml(uiT('count', { count: items.length }))}</b></summary>${makeRows(items)}</details>`;
    const topic = document.getElementById('result-topic-text');
    topic.insertAdjacentElement('afterend', panel);
    await syncWordbookButtons();
}

function buildWordbookButtonHtml(item) {
    const isWordbookSession = (window.selectedQuizSection === VIRTUAL_SECTION_WORDBOOK);
    const safeId = `wb_${item.stage}_${item.hanzi}_${item.meaning}`.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const itemData = `data-item-id="${escapeHtml(item.id || '')}" data-stage="${escapeHtml(item.stage)}" data-hanzi="${escapeHtml(item.hanzi)}" data-meaning="${escapeHtml(item.meaning)}"`;

    if (isWordbookSession) {
        // 단어장 세션 결과에서는 "빼기" 버튼
        return `<button class="wordbook-action-btn remove js-action-wordbook-remove" type="button" ${itemData}
                    data-wordbook-action="remove">
                    ${escapeHtml(uiT('removeWord'))}
                </button>`;
    } else {
        // 일반 섹션 결과에서는 "추가" 버튼
        return `<button id="${safeId}" class="wordbook-action-btn add js-action-wordbook-add" type="button" ${itemData}
                    data-wordbook-action="add">
                    ${escapeHtml(uiT('addWord'))}
                </button>`;
    }
}

function getWordbookItemFromButton(button) {
    const id = button.dataset.itemId || '';
    const stage = Number(button.dataset.stage);
    const hanzi = button.dataset.hanzi || '';
    const meaning = button.dataset.meaning || '';
    const sources = [...wrongAnswers, ...correctAnswers, ...shuffledQuestions];

    const original = sources.find((item) =>
        Number(item.stage) === stage &&
        String(item.hanzi) === hanzi &&
        String(item.meaning) === meaning
    );

    return original ? { ...original, id: original.id || id, stage } : { id, stage, hanzi, meaning };
}

function setWordbookButtonState(button, isSaved) {
    button.disabled = false;
    button.classList.toggle('add', !isSaved);
    button.classList.toggle('added', isSaved);
    button.classList.toggle('remove', isSaved);
    button.classList.toggle('js-action-wordbook-add', !isSaved);
    button.classList.toggle('js-action-wordbook-remove', isSaved);
    button.dataset.wordbookAction = isSaved ? 'remove' : 'add';
    button.textContent = isSaved ? uiT('removeWord') : uiT('addWord');
}

async function syncWordbookButtons() {
    const buttons = document.querySelectorAll('.wordbook-action-btn');
    await Promise.all(Array.from(buttons).map(async (button) => {
        const item = getWordbookItemFromButton(button);
        const isSaved = await isInWordbook(item.stage, item.hanzi, item.meaning, item.id || '');
        setWordbookButtonState(button, isSaved);
    }));
}

async function addToWordbookAndRefresh(button) {
    if (!button || button.disabled) return;

    button.disabled = true;
    try {
        const item = getWordbookItemFromButton(button);
        if (await isInWordbook(item.stage, item.hanzi, item.meaning, item.id || '')) {
            await removeFromWordbookDB(item.stage, item.hanzi, item.meaning, item.id || '');
            setWordbookButtonState(button, false);
        } else {
            await addToWordbook(item);
            setWordbookButtonState(button, true);
        }
        await updateSectionBadge();
        await syncWordbookButtons();
        if (document.getElementById('wordbook-learning-result')) await renderWordbookLearningResult(quizSessionCategory, wordbookResultRenderToken);
    } catch (error) {
        console.error('단어장 추가 실패:', error);
        button.disabled = false;
        showStreakToast(uiT('addWordError'), false);
    }
}

async function removeFromWordbookAndRefresh(button) {
    if (!button || button.disabled) return;

    button.disabled = true;
    try {
        const item = getWordbookItemFromButton(button);
        await removeFromWordbookDB(item.stage, item.hanzi, item.meaning, item.id || '');
        setWordbookButtonState(button, false);
        await updateSectionBadge();
        await syncWordbookButtons();
    } catch (error) {
        console.error('단어장 삭제 실패:', error);
        button.disabled = false;
        showStreakToast(uiT('removeWordError'), false);
    }
}
