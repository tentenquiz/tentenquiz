const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const source = `${fs.readFileSync(path.join(projectRoot, 'db.js'), 'utf8')}\n;globalThis.__dbName = TENTEN_DB_NAME; globalThis.__makeProgressId = makeProgressId;`;
const languages = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'fr', 'de', 'es', 'vi', 'ar', 'it', 'ru'];
const names = new Set();

for (const nativeLanguage of languages) {
    for (const learningLanguage of languages) {
        if (nativeLanguage === learningLanguage) continue;
        const context = {
            window: { tentenGlobal: { interfaceLanguage: nativeLanguage, learningLanguage } },
            console,
            indexedDB: {}
        };
        vm.createContext(context);
        vm.runInContext(source, context);
        const expected = `tenTenQuizGlobalDB_${nativeLanguage}_to_${learningLanguage}`;
        if (context.__dbName !== expected) {
            throw new Error(`storage partition mismatch: expected ${expected}, received ${context.__dbName}`);
        }
        if (names.has(context.__dbName)) throw new Error(`duplicate storage partition: ${context.__dbName}`);
        names.add(context.__dbName);

        const progressId = context.__makeProgressId({ id: 'nw_0001' });
        if (progressId !== `${nativeLanguage}_to_${learningLanguage}_nw_0001`) {
            throw new Error(`progress partition mismatch: ${progressId}`);
        }
    }
}

if (names.size !== 132) throw new Error(`expected 132 language-pair stores, received ${names.size}`);
console.log('OK: 132 native-to-learning language pairs use independent review, wordbook, and progress stores');
