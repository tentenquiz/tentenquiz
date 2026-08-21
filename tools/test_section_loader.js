const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const inlineScripts = Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi), (match) => match[1]);
const loaderSource = inlineScripts.find((source) => source.includes('window.quizSectionRegistry'));
if (!loaderSource) throw new Error('section loader inline script was not found');

const expectedFiles = [
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

const context = {
    window: { tentenT: (key) => key },
    setTimeout,
    clearTimeout,
    Promise,
    fetch: async (url) => {
        const fileName = String(url).replace(/^data\//, '');
        const index = expectedFiles.indexOf(fileName);
        if (index < 0) return { ok: false, json: async () => [] };
        await new Promise((resolve) => setTimeout(resolve, (expectedFiles.length - index) * 2));
        return {
            ok: true,
            json: async () => [{ id: fileName.replace(/\.json$/, '') }]
        };
    }
};
vm.createContext(context);
vm.runInContext(loaderSource, context);

(async () => {
    await context.window.loadQuizSectionsFromJson();
    const actualFiles = context.window.quizSectionRegistry.map((section) => `${section.key}.json`);
    if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
        throw new Error(`section order changed with reverse network timing: ${actualFiles.join(', ')}`);
    }
    if (context.window.quizSectionRegistry.some((section) => section.data.length !== 1)) {
        throw new Error('loaded section data was not registered');
    }

    await context.window.loadQuizSectionsFromJson();
    if (context.window.quizSectionRegistry.length !== expectedFiles.length) {
        throw new Error('repeated loading duplicated section registrations');
    }

    console.log('OK: 10 sections keep the configured order even when responses arrive in reverse');
    console.log('OK: section loading is idempotent');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
