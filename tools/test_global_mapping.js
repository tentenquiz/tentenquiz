const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');

const storage = new Map();
const context = {
    window: { location: { search: '', href: 'https://tentenquiz.com/?learn=ja&native=en' } },
    localStorage: {
        getItem: (key) => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, String(value))
    },
    URLSearchParams,
    URL
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(projectRoot, 'global-config.js'), 'utf8'), context);

for (const nativeLanguage of context.window.TENTEN_LANGUAGES) {
    const choices = context.window.getTentenLearningLanguages(nativeLanguage.code);
    if (choices.length !== context.window.TENTEN_LANGUAGES.length - 1) {
        throw new Error(`${nativeLanguage.code}: learning-language list must contain exactly 11 choices`);
    }
    if (choices.some((language) => language.code === nativeLanguage.code)) {
        throw new Error(`${nativeLanguage.code}: native language must be excluded from learning-language choices`);
    }
}

const expectedLearningLabels = {
    en: 'English',
    ko: '한국어 (Korean)',
    ja: '日本語 (Japanese)',
    'zh-CN': '简体中文 (Simplified Chinese)',
    'zh-TW': '繁體中文 (Traditional Chinese)',
    fr: 'Français (French)',
    de: 'Deutsch (German)',
    es: 'Español (Spanish)',
    vi: 'Tiếng Việt (Vietnamese)',
    ar: 'العربية (Arabic)',
    it: 'Italiano (Italian)',
    ru: 'Русский (Russian)'
};
for (const [code, expectedLabel] of Object.entries(expectedLearningLabels)) {
    const actualLabel = context.window.getTentenLearningLanguageLabel(code);
    if (actualLabel !== expectedLabel) {
        throw new Error(`${code}: expected learning label "${expectedLabel}", received "${actualLabel}"`);
    }
}

const matchingPairContext = {
    window: {
        location: {
            search: '?learn=ko&native=ko',
            href: 'https://tentenquiz.com/?learn=ko&native=ko'
        }
    },
    localStorage: context.localStorage,
    URLSearchParams,
    URL
};
vm.createContext(matchingPairContext);
vm.runInContext(fs.readFileSync(path.join(projectRoot, 'global-config.js'), 'utf8'), matchingPairContext);
if (matchingPairContext.window.tentenGlobal.learningLanguage === matchingPairContext.window.tentenGlobal.interfaceLanguage) {
    throw new Error('matching native and learning URL preferences must be normalized to different languages');
}

const dataFiles = [
    'nature_weather.json',
    'people_relations.json',
    'body_health.json',
    'food_drink.json',
    'home_daily_life.json',
    'activities_leisure.json',
    'places_transport.json',
    'school_work.json',
    'shopping_money.json',
    'time_calendar.json'
];
const sectionRows = dataFiles.map((fileName) => ({
    fileName,
    rows: JSON.parse(fs.readFileSync(path.join(projectRoot, 'data', fileName), 'utf8'))
}));
const rows = sectionRows.flatMap((section) => section.rows);
const sun = rows.find((row) => row.id === 'nw_0001');
const enabledAudioLanguages = new Set(context.window.TENTEN_LANGUAGES.map((language) => language.code));

function resolve(learn, native, chineseReading = 'pinyin') {
    context.window.tentenGlobal.learningLanguage = learn;
    context.window.tentenGlobal.interfaceLanguage = native;
    context.window.tentenGlobal.chineseReading = chineseReading;
    return context.window.resolveGlobalQuizItem(sun);
}

let result = resolve('ja', 'ko');
if (result.quizText !== 'たいよう' || result.meaning !== '해') throw new Error('Japanese/Korean mapping failed');

result = resolve('zh-TW', 'fr');
if (result.quizText !== 'tàiyáng' || result.meaning !== 'soleil') throw new Error('Traditional Chinese pinyin mapping failed');

result = resolve('zh-TW', 'fr', 'zhuyin');
if (result.quizText !== 'ㄊㄞˋ ㄧㄤˊ') throw new Error('Traditional Chinese zhuyin mapping failed');

result = resolve('ar', 'en');
if (result.quizText !== 'شمس' || result.meaning !== 'sun' || result.direction !== 'ltr') throw new Error('Arabic/English mapping failed');

result = resolve('ru', 'vi');
if (result.quizText !== 'солнце' || result.meaning !== 'mặt trời') throw new Error('Russian/Vietnamese mapping failed');

if (result.audioFile !== sun.audioFile_ru) throw new Error('Russian audio file mapping failed');
if (result.answerAudioFile !== sun.audioFile_vi) throw new Error('Vietnamese native-answer audio file mapping failed');

context.window.tentenGlobal.learningLanguage = 'ru';
context.window.tentenGlobal.interfaceLanguage = 'es';
context.window.tentenGlobal.chineseReading = 'zhuyin';
const preferenceUrl = new URL(context.window.buildTentenPreferenceUrl(context.window.location.href));
if (
    preferenceUrl.searchParams.get('learn') !== 'ru' ||
    preferenceUrl.pathname !== '/es/' ||
    preferenceUrl.searchParams.has('native') ||
    preferenceUrl.searchParams.get('zhReading') !== 'zhuyin'
) {
    throw new Error('language preferences do not move stale URL parameters to the localized static route');
}

const storedKoreanItem = {
    id: sun.id,
    hanzi: sun.word_ja,
    reading: sun.reading_ja,
    meaning: sun.word_ko,
    note: sun.note_ko,
    audioFile: sun.audioFile_ja,
    options: [sun.word_ko, '오답1', '오답2', '오답3'],
    correct: 0,
    interfaceLanguage: 'ko',
    totalWrongCount: 4
};
const currentFrenchItem = {
    id: sun.id,
    hanzi: sun.word_ja,
    reading: sun.reading_ja,
    meaning: sun.word_fr,
    note: sun.note_fr,
    audioFile: sun.audioFile_ja,
    answerAudioFile: sun.audioFile_fr,
    options: [sun.word_fr, 'faux 1', 'faux 2', 'faux 3'],
    correct: 0,
    learningLanguage: 'ja',
    interfaceLanguage: 'fr',
    isGlobalData: true
};
const refreshedStoredItem = context.window.mergeTentenStoredItem(storedKoreanItem, currentFrenchItem);
if (
    refreshedStoredItem.id !== sun.id ||
    refreshedStoredItem.totalWrongCount !== 4 ||
    refreshedStoredItem.meaning !== sun.word_fr ||
    refreshedStoredItem.note !== sun.note_fr ||
    refreshedStoredItem.answerAudioFile !== sun.audioFile_fr ||
    refreshedStoredItem.options[0] !== sun.word_fr ||
    refreshedStoredItem.interfaceLanguage !== 'fr'
) {
    throw new Error('stored review items are not refreshed for the current interface language');
}

const runtimeSource = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
if (/if\s*\(item\.audioFile\)\s*return\s+item/.test(runtimeSource)) {
    throw new Error('stored review items with audio still bypass the current interface-language refresh');
}

const japaneseQuestion = {
    isGlobalData: true,
    learningLanguage: 'ja',
    hanzi: sun.word_ja,
    reading: sun.reading_ja
};
if (context.window.getTentenInQuizRevealSecondary(japaneseQuestion) !== '') {
    throw new Error('Japanese orthography must stay hidden until the result screen');
}
if (context.window.getTentenResultHeadword(japaneseQuestion) !== sun.word_ja) {
    throw new Error('Japanese result screen must reveal the Japanese headword');
}

const traditionalChineseQuestion = {
    isGlobalData: true,
    learningLanguage: 'zh-TW',
    hanzi: sun.word_zh_tw,
    reading: sun.zhuyin_zh_tw
};
if (context.window.getTentenInQuizRevealSecondary(traditionalChineseQuestion) !== '') {
    throw new Error('Traditional Chinese orthography must stay hidden until the result screen');
}
if (context.window.getTentenResultHeadword(traditionalChineseQuestion) !== sun.word_zh_tw) {
    throw new Error('Traditional Chinese result screen must reveal the Traditional Chinese headword');
}

const simplifiedChineseQuestion = {
    isGlobalData: true,
    learningLanguage: 'zh-CN',
    hanzi: sun.word_zh_cn,
    reading: sun.reading_zh_cn
};
if (context.window.getTentenInQuizRevealSecondary(simplifiedChineseQuestion) !== '') {
    throw new Error('Simplified Chinese orthography must stay hidden until the result screen');
}
if (context.window.getTentenResultHeadword(simplifiedChineseQuestion) !== sun.word_zh_cn) {
    throw new Error('Simplified Chinese result screen must reveal the Simplified Chinese headword');
}

const englishQuestion = {
    isGlobalData: true,
    learningLanguage: 'en',
    hanzi: sun.word_en,
    reading: sun.reading_en
};
if (context.window.getTentenInQuizRevealSecondary(englishQuestion) !== sun.word_en) {
    throw new Error('Alphabetic target words may remain visible in the answer reveal');
}

for (const row of rows) {
    for (const language of context.window.TENTEN_LANGUAGES) {
        const audioFile = row[`audioFile_${language.suffix}`];
        if (!audioFile || !fs.existsSync(path.join(projectRoot, audioFile))) {
            throw new Error(`${row.id}: ${language.code} bundled audio file is missing`);
        }
    }

    for (const learning of context.window.TENTEN_LANGUAGES) {
        for (const native of context.window.TENTEN_LANGUAGES) {
            if (learning.code === native.code) continue;
            context.window.tentenGlobal.learningLanguage = learning.code;
            context.window.tentenGlobal.interfaceLanguage = native.code;
            context.window.tentenGlobal.chineseReading = 'pinyin';
            result = context.window.resolveGlobalQuizItem(row);

            const expectedWord = row[`word_${learning.suffix}`];
            const expectedReading = row[`reading_${learning.suffix}`];
            const expectedQuizText = ['ja', 'zh-CN', 'zh-TW'].includes(learning.code)
                ? expectedReading
                : expectedWord;
            if (result.targetWord !== expectedWord) throw new Error(`${row.id}: ${learning.code} target word mapping failed`);
            if (result.targetReading !== expectedReading) throw new Error(`${row.id}: ${learning.code} reading mapping failed`);
            if (result.quizText !== expectedQuizText) throw new Error(`${row.id}: ${learning.code} quiz text mapping failed`);
            if (result.meaning !== row[`word_${native.suffix}`]) throw new Error(`${row.id}: ${native.code} meaning mapping failed`);
            if (result.note !== row[`note_${native.suffix}`]) throw new Error(`${row.id}: ${native.code} note mapping failed`);
            if (result.direction !== native.direction) throw new Error(`${row.id}: ${native.code} text direction mapping failed`);
            const expectedAudioFile = row[`audioFile_${learning.suffix}`];
            if (result.audioFile !== expectedAudioFile) {
                throw new Error(`${row.id}: ${learning.code} audio file mapping failed`);
            }
            const expectedAnswerAudioFile = row[`audioFile_${native.suffix}`];
            if (result.answerAudioFile !== expectedAnswerAudioFile) {
                throw new Error(`${row.id}: ${native.code} native-answer audio file mapping failed`);
            }
            if (enabledAudioLanguages.has(learning.code) && !result.audioFile) {
                throw new Error(`${row.id}: ${learning.code} audio file must be connected`);
            }
            if (!enabledAudioLanguages.has(learning.code) && result.audioFile !== '') {
                throw new Error(`${row.id}: ${learning.code} audio file must remain empty`);
            }
        }
    }

    context.window.tentenGlobal.learningLanguage = 'zh-TW';
    context.window.tentenGlobal.interfaceLanguage = 'en';
    context.window.tentenGlobal.chineseReading = 'zhuyin';
    result = context.window.resolveGlobalQuizItem(row);
    if (result.targetReading !== row.zhuyin_zh_tw || result.quizText !== row.zhuyin_zh_tw) {
        throw new Error(`${row.id}: Traditional Chinese zhuyin mapping failed`);
    }
}

let quizPoolsChecked = 0;
let zhuyinPoolsChecked = 0;
let distractorPoolsChecked = 0;
for (const section of sectionRows) {
    if (section.rows.length !== 250) throw new Error(`${section.fileName}: expected 250 records`);
    for (let stage = 1; stage <= 10; stage += 1) {
        const pool = section.rows.filter((row) => Number(row.stage) === stage);
        if (pool.length !== 25) throw new Error(`${section.fileName} stage ${stage}: expected 25 records`);

        for (const language of context.window.TENTEN_LANGUAGES) {
            const prompts = pool.map((row) => {
                context.window.tentenGlobal.learningLanguage = language.code;
                context.window.tentenGlobal.interfaceLanguage = language.code === 'en' ? 'ko' : 'en';
                context.window.tentenGlobal.chineseReading = 'pinyin';
                return context.window.resolveGlobalQuizItem(row).quizText.toLocaleLowerCase();
            });
            if (new Set(prompts).size !== 25) {
                throw new Error(`${section.fileName} stage ${stage}: duplicate ${language.code} quiz prompts`);
            }

            const meanings = pool.map((row) => String(row[`word_${language.suffix}`]).trim().toLocaleLowerCase());
            if (new Set(meanings).size !== 25) {
                throw new Error(`${section.fileName} stage ${stage}: ambiguous ${language.code} answer choices`);
            }
            const sectionKey = section.fileName.replace(/\.json$/i, '');
            const quizItems = pool.map((row) => ({
                stage: row.stage,
                category: sectionKey,
                section: sectionKey,
                meaning: row[`word_${language.suffix}`]
            }));
            for (const quizItem of quizItems) {
                const candidates = [
                    ...quizItems,
                    { stage: stage === 10 ? 9 : stage + 1, category: sectionKey, meaning: '__OTHER_STAGE__' },
                    { stage, category: '__OTHER_SECTION__', meaning: '__OTHER_SECTION__' }
                ];
                const distractors = context.window.getTentenDistractorPool(candidates, quizItem);
                if (
                    distractors.length !== 24 ||
                    distractors.includes(quizItem.meaning) ||
                    distractors.includes('__OTHER_STAGE__') ||
                    distractors.includes('__OTHER_SECTION__')
                ) {
                    throw new Error(`${section.fileName} stage ${stage}: invalid ${language.code} distractor pool`);
                }
                distractorPoolsChecked += 1;
            }
            quizPoolsChecked += 1;

            if (language.code === 'zh-TW') {
                const zhuyinPrompts = pool.map((row) => {
                    context.window.tentenGlobal.learningLanguage = 'zh-TW';
                    context.window.tentenGlobal.interfaceLanguage = 'en';
                    context.window.tentenGlobal.chineseReading = 'zhuyin';
                    return context.window.resolveGlobalQuizItem(row).quizText;
                });
                if (new Set(zhuyinPrompts).size !== 25) {
                    throw new Error(`${section.fileName} stage ${stage}: duplicate zhuyin quiz prompts`);
                }
                zhuyinPoolsChecked += 1;
            }
        }
    }
}

console.log(`OK: ${rows.length} records mapped across every supported learning/interface language pair`);
console.log('OK: every learning and native-answer language maps to its bundled audio file');
console.log(`OK: ${quizPoolsChecked} section-stage-language pools contain 25 unique prompts and answers`);
console.log(`OK: ${zhuyinPoolsChecked} Traditional Chinese pools contain 25 unique zhuyin prompts`);
console.log(`OK: ${distractorPoolsChecked} questions each receive 24 same-section, same-stage distractors`);
console.log('OK: Japanese and Chinese orthography stays hidden until results, then the headword is revealed');
console.log('OK: changed language preferences replace stale URL parameters');
console.log('OK: saved wrong answers and wordbook entries refresh into the current interface language');
console.log('OK: every native language is excluded from its learning-language choices');
console.log('OK: learning-language choices include native and English names');
