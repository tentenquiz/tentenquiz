const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const storage = new Map();
const context = {
    window: { location: { search: '' } },
    localStorage: {
        getItem: (key) => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, String(value))
    },
    URLSearchParams
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(projectRoot, 'global-config.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(projectRoot, 'i18n.js'), 'utf8'), context);

const expectedCodes = context.window.TENTEN_LANGUAGES.map((language) => language.code);
const messages = context.window.TENTEN_I18N_MESSAGES;
const englishKeys = Object.keys(messages.en).sort();

for (const code of expectedCodes) {
    if (!messages[code]) throw new Error(`${code}: translation table is missing`);
    const keys = Object.keys(messages[code]).sort();
    if (JSON.stringify(keys) !== JSON.stringify(englishKeys)) {
        const missing = englishKeys.filter((key) => !keys.includes(key));
        const extra = keys.filter((key) => !englishKeys.includes(key));
        throw new Error(`${code}: translation keys differ; missing=${missing}; extra=${extra}`);
    }

    context.window.tentenGlobal.interfaceLanguage = code;
    for (const key of englishKeys) {
        const translated = context.window.tentenT(key, {
            language: 'TEST', round: 2, time: '4.20', current: 1, total: 10,
            seconds: 10, stage: 3, count: 25, learned: 10, remaining: 15, score: 8,
            date: 'Aug 19, 2026, 7:00 PM'
        });
        if (!translated || translated === key || /\{[a-z]+\}/i.test(translated)) {
            throw new Error(`${code}.${key}: unresolved translation or placeholder`);
        }
    }

    for (const key of ['stageWhyBody', 'tenWhyBody', 'wordbookGuideBody']) {
        if (messages[code][key].length < 80) {
            throw new Error(`${code}.${key}: accordion guidance is too brief`);
        }
    }
    for (const key of ['stageWhyTitle', 'tenWhyTitle', 'wordbookGuideTitle']) {
        if (messages[code][key].includes('▼')) {
            throw new Error(`${code}.${key}: the translated title must not contain the separate arrow icon`);
        }
    }
}

const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
const learningRecords = fs.readFileSync(path.join(projectRoot, 'learning-records.js'), 'utf8');
const configIndex = html.indexOf('global-config.js');
const i18nIndex = html.indexOf('i18n.js');
const dbIndex = html.indexOf('db.js');
if (!(configIndex >= 0 && configIndex < i18nIndex && i18nIndex < dbIndex)) {
    throw new Error('global-config.js, i18n.js, and db.js are not loaded in the required order');
}

const usedKeys = new Set();
for (const match of html.matchAll(/data-i18n(?:-aria)?="([a-zA-Z0-9_]+)"/g)) usedKeys.add(match[1]);
for (const match of script.matchAll(/uiT\(\s*['"]([a-zA-Z0-9_]+)['"]/g)) usedKeys.add(match[1]);
for (const match of learningRecords.matchAll(/translate\(\s*['"]([a-zA-Z0-9_]+)['"]/g)) usedKeys.add(match[1]);
for (const match of html.matchAll(/tentenT\(\s*['"]([a-zA-Z0-9_]+)['"]/g)) usedKeys.add(match[1]);
const unknownUsedKeys = Array.from(usedKeys).filter((key) => !messages.en[key]).sort();
if (unknownUsedKeys.length) throw new Error(`UI uses unknown translation keys: ${unknownUsedKeys.join(', ')}`);
if (!script.includes('navigator.share')) throw new Error('global sharing does not use the Web Share API');
if (script.includes('kakaotalk://')) throw new Error('quiz sharing still forces the KakaoTalk app');

console.log(`OK: ${expectedCodes.length} complete interface translation tables`);
console.log(`OK: ${englishKeys.length} localized core UI messages with resolved placeholders`);
console.log(`OK: ${usedKeys.size} translation keys referenced by HTML and runtime code`);
console.log('OK: all 12 languages include substantial guidance for the three accordions');
console.log('OK: global Web Share with no forced messenger app');
