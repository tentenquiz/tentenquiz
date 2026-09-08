// Run: node tools/test_daily_quiz_stage_cap.js (no browser or persistent data writes).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const sections = ['nature_weather', 'people_relations', 'body_health', 'food_drink',
    'home_daily_life', 'activities_leisure', 'places_transport', 'school_work', 'shopping_money', 'time_calendar'];
const registry = sections.map(key => ({ key, data: JSON.parse(fs.readFileSync(path.join(root, 'data', `${key}.json`), 'utf8')) }));
const data = registry.flatMap(s => s.data.map(w => ({ ...w, category: s.key, hanzi: w.word_ja, meaning: w.word_ko })));
function app() {
    const storage = new Map();
    const records = new Map();
    const noop = () => {};
    const element = () => ({ classList: { add: noop, remove: noop, toggle: noop }, style: {}, dataset: {}, addEventListener: noop });
    const win = {
        console, setTimeout, clearTimeout, setInterval, clearInterval, URL, URLSearchParams, Intl,
        localStorage: { get length() { return storage.size; }, key: i => [...storage.keys()][i],
            getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,String(v)), removeItem: k => storage.delete(k) },
        tentenGlobal: { interfaceLanguage: 'ko', learningLanguage: 'ja' },
        quizSectionRegistry: registry, TENTEN_LANGUAGES: ['ko','ja','en'].map(code => ({ code })),
        addEventListener: noop, dispatchEvent: noop, requestAnimationFrame: () => 0,
        matchMedia: () => ({ matches: false, addEventListener: noop }),
        navigator: { userAgent: 'node' }, screen: {}, location: { href: 'https://test.invalid/', search: '', pathname: '/' },
        history: { replaceState: noop }, Audio: function () {},
        document: { readyState: 'loading', addEventListener: noop, getElementById: () => null,
            querySelector: () => null, querySelectorAll: () => [], createElement: element, body: element() },
        STORE_WRONG: 'wrong', STORE_WORDBOOK: 'book', STORE_PROGRESS: 'progress'
    };
    win.window = win; win.globalThis = win; win.self = win;
    const pair = () => `${win.tentenGlobal.interfaceLanguage}_to_${win.tentenGlobal.learningLanguage}`;
    win.makeProgressId = w => `${pair()}_${w.id}`;
    win.dbGetAll = async key => records.get(`${pair()}:${key}`) || [];
    vm.createContext(win);
    vm.runInContext(fs.readFileSync(path.join(root,'script.js'),'utf8'),win);
    win.fixtureData = data;
    vm.runInContext('activeQuizData = fixtureData;',win);
    const put = (key,items) => records.set(`${pair()}:${key}`,items);
    const complete = stages => {
        const store = win.readSectionPerfectStore();
        for (const stage of stages) for (const section of sections) store.sections[`${stage}::${section}`] = {
            masteredAt: Date.now(), lastGameAt: Date.now(), perfectStreak: 3, bestPerfectStreak: 3
        };
        win.saveSectionPerfectStore(store);
    };
    return { win, storage, records, put, complete };
}
async function verify(a, cap) {
    const before = JSON.stringify([...a.records]);
    const progress = await a.win.dbGetAll('progress');
    assert.equal(a.win.getDailyQuizMaxAllowedStage(progress),cap);
    const pools = await a.win.loadDailyQuizCandidateContext();
    for (const [name, pool] of Object.entries(pools)) assert.ok(pool.every(w => w.stage >= 1 && w.stage <= cap),name);
    assert.equal(Math.max(...pools.allPool.map(w=>w.stage)),cap);
    for (let i=0;i<5;i++) {
        const chosen = await a.win.buildDailyQuizQuestions();
        assert.equal(chosen.length,12);
        assert.equal(new Set(chosen.map(w=>w.id)).size,12);
        assert.ok(chosen.every(w=>w.stage<=cap));
    }
    assert.equal(JSON.stringify([...a.records]),before,'records unchanged');
    assert.equal(vm.runInContext('activeQuizData === fixtureData',a.win),true);
    return pools;
}
async function test(name, fn) { await fn(); console.log(`PASS ${name}`); }
(async () => {
    for (const [name,stages,cap] of [
        ['1 new user',[],1], ['2 stage 1',[1],2], ['3 stages 1-3',[1,2,3],4],
        ['6 gaps',[1,2,7],3], ['7 stage 10 only',[10],1], ['8 all stages',[1,2,3,4,5,6,7,8,9,10],10]
    ]) await test(name,async()=>{ const a=app(); a.complete(stages); await verify(a,cap); });
    await test('4 high-stage wrong/progress preserved, all review pools filtered',async()=>{
        const a=app(); a.complete([1]); const high=data.filter(w=>w.stage===10).slice(0,12);
        a.put('wrong',high); a.put('progress',high.map(w=>({id:a.win.makeProgressId(w),learnedAt:Date.now()})));
        const p=await verify(a,2); assert.equal(p.wrongPool.length,0); assert.equal(p.duePool.length,0); assert.equal(p.confidencePool.length,0);
    });
    await test('5 high-stage wordbook preserved',async()=>{
        const a=app(); a.put('book',data.filter(w=>w.stage===10)); const p=await verify(a,1); assert.equal(p.wordbookPool.length,0);
    });
    await test('9 partial sections / one perfect / played words are not completion',async()=>{
        const a=app(); a.complete([1]); const store=a.win.readSectionPerfectStore();
        store.sections[`1::${sections[9]}`]={perfectStreak:1,bestPerfectStreak:1,masteredAt:0,lastGameAt:Date.now()};
        a.win.saveSectionPerfectStore(store);
        a.put('progress',data.filter(w=>w.stage===1).map(w=>({id:a.win.makeProgressId(w),learnedAt:Date.now()})));
        await verify(a,1);
    });
    await test('10 legacy completion matches existing stage predicate',async()=>{
        for (const learnedAt of [Date.UTC(2020,0,1),undefined]) {
            const a=app(); const words=data.filter(w=>w.stage===1);
            const progress=words.map(w=>({id:a.win.makeProgressId(w),learnedAt})); a.put('progress',progress);
            assert.equal(a.win.isStageCompleted(words,sections.map(key=>({key,questions:words.filter(w=>w.section===key)})),a.win.buildLearnedAtMap(progress),a.win.readSectionPerfectStore(),1),true);
            await verify(a,2);
        }
    });
    await test('11 existing high-stage session and progress preserved; same-day completion does not reseed',async()=>{
        const a=app(); let s=await a.win.createDailyQuizSession();
        s.dailyWordKeys=data.filter(w=>w.stage===10).slice(0,12).map(w=>w.id);
        s.wordStats=a.win.createDailyQuizWordStats(s.dailyWordKeys); a.win.createDailyQuizGame(s);
        const key=s.currentGame.questionKeys[0]; s.currentGame.shownQuestionKeys=[key];
        s.currentGame.results=[{questionKey:key,status:'correct'}]; s.wordStats[key].exposureCount=1; s.wordStats[key].correctCount=1;
        a.win.saveDailyQuizSession(s); const before=JSON.stringify(a.win.readDailyQuizSession());
        assert.equal(JSON.stringify(await a.win.getOrCreateDailyQuizSession()),before);
        a.complete([1,2,3]); assert.equal(JSON.stringify(await a.win.getOrCreateDailyQuizSession()),before);
    });
    await test('12 next date generates session using latest contiguous progress',async()=>{
        const a=app(); const s=await a.win.createDailyQuizSession(); s.dateKey='2000-01-01'; a.win.saveDailyQuizSession(s);
        a.complete([1,2,3]); a.put('wrong',data.filter(w=>w.stage===4));
        const next=await a.win.getOrCreateDailyQuizSession(); assert.equal(next.dateKey,a.win.getDailyQuizDateKey());
        const words=next.dailyWordKeys.map(a.win.findDailyQuizQuestion); assert.ok(words.some(w=>w.stage===4)); assert.ok(words.every(w=>w.stage<=4));
    });
    await test('13 language pair isolation for legacy and mastered records',async()=>{
        const a=app(); a.complete([1,2,3]);
        a.put('progress',data.filter(w=>w.stage<=4).map(w=>({id:a.win.makeProgressId(w),learnedAt:1})));
        await verify(a,5); a.win.tentenGlobal.learningLanguage='en'; await verify(a,1);
        a.complete([1]); await verify(a,2); a.win.tentenGlobal.learningLanguage='ja'; await verify(a,5);
    });
    await test('14 production backup completion round trip reproduces cap',async()=>{
        const a=app(),b=app(); a.complete([1,2,7]);
        for(const x of [a,b]) vm.runInContext(fs.readFileSync(path.join(root,'learning-records.js'),'utf8'),x.win);
        const backup=JSON.parse(JSON.stringify(a.win.TentenLearningRecords.collectSectionPerfectStores()));
        b.win.TentenLearningRecords.restoreSectionPerfectStores(backup); await verify(b,3);
    });
    await test('insufficient eligible words fail instead of taking higher stages',async()=>{
        const a=app(); a.win.fixtureData=data.filter(w=>w.stage!==1).concat(data.filter(w=>w.stage===1).slice(0,11));
        vm.runInContext('activeQuizData = fixtureData',a.win);
        await assert.rejects(()=>a.win.createDailyQuizSession(),/12/);
        assert.equal(a.storage.size,0);
    });
    await test('read failure defaults to stage 1',async()=>{
        const a=app(); a.complete([1,2,3]); a.win.console={...console,warn:()=>{}};
        a.win.dbGetAll=async()=>{throw new Error('fixture read failure');};
        assert.ok((await a.win.buildDailyQuizQuestions()).every(w=>w.stage===1));
    });
    console.log('Stage cap tests passed. Run test_daily_quiz_clear_rules_browser.js for scenario 15 (A-E).');
})().catch(error=>{console.error(error);process.exitCode=1;});
