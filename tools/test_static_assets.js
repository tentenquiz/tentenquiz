const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
const localAssets = new Set();

for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|data:|mailto:|tel:)/i.test(reference)) continue;
    localAssets.add(reference.split('?')[0]);
}

const footerMatch = html.match(/<footer\b([^>]*)>([\s\S]*?)<\/footer>/i);
const pendingHiddenLinks = new Set();
if (footerMatch && /\bhidden\b/i.test(footerMatch[1])) {
    for (const match of footerMatch[2].matchAll(/href="([^"]+)"/g)) {
        pendingHiddenLinks.add(match[1].split('?')[0]);
    }
}

const missingVisibleAssets = [];
for (const asset of localAssets) {
    if (fs.existsSync(path.join(projectRoot, asset))) continue;
    if (pendingHiddenLinks.has(asset)) continue;
    missingVisibleAssets.push(asset);
}
if (missingVisibleAssets.length) {
    throw new Error(`visible local assets are missing: ${missingVisibleAssets.join(', ')}`);
}

const requiredBundledAssets = [
    'vendor/canvas-confetti/confetti.browser.min.js',
    'vendor/canvas-confetti/LICENSE',
    'assets/ui/perfect-score-100.svg',
    'assets/ui/daily-quiz-spark.svg',
    'manifest.webmanifest',
    'pwa-install.js',
    'service-worker.js'
];
for (const asset of requiredBundledAssets) {
    if (!fs.existsSync(path.join(projectRoot, asset))) {
        throw new Error(`required bundled asset is missing: ${asset}`);
    }
}

if (/https?:\/\/[^"']*canvas-confetti/i.test(html)) {
    throw new Error('canvas-confetti must load from the bundled local file');
}
const serviceWorker = fs.readFileSync(path.join(projectRoot, 'service-worker.js'), 'utf8');
if (!serviceWorker.includes("'./vendor/canvas-confetti/confetti.browser.min.js'")) {
    throw new Error('the bundled confetti engine must be included in the offline app shell');
}
if (!serviceWorker.includes("'./assets/ui/daily-quiz-spark.svg'")) {
    throw new Error('the daily quiz spark must be included in the offline app shell');
}
if (!script.includes('assets/ui/perfect-score-100.svg')) {
    throw new Error('the perfect-score celebration must use the bundled 100-point image');
}

const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone' || manifest.start_url !== './' || manifest.scope !== './') {
    throw new Error('the web app manifest must install TentenQuiz in standalone mode within its own scope');
}
if (manifest.name !== 'TentenQuiz Global' || manifest.short_name !== 'TentenQuiz Global') {
    throw new Error('the installed app label must be exactly "TentenQuiz Global"');
}
for (const requiredSize of ['192x192', '512x512']) {
    const icon = manifest.icons && manifest.icons.find((item) => item.sizes === requiredSize);
    if (!icon || !fs.existsSync(path.join(projectRoot, icon.src))) {
        throw new Error(`the web app manifest is missing its ${requiredSize} install icon`);
    }
}
if (!html.includes('rel="manifest"') || !html.includes('src="pwa-install.js')) {
    throw new Error('the install manifest and install controller must be linked from the main page');
}

const dataFiles = [
    'nature_weather.json', 'people_relations.json', 'body_health.json', 'food_drink.json',
    'home_daily_life.json', 'activities_leisure.json', 'places_transport.json',
    'school_work.json', 'shopping_money.json', 'time_calendar.json'
];
for (const fileName of dataFiles) {
    if (!fs.existsSync(path.join(projectRoot, 'data', fileName))) {
        throw new Error(`registered data file is missing: ${fileName}`);
    }
}

console.log(`OK: ${localAssets.size - pendingHiddenLinks.size} visible local assets exist`);
console.log(`OK: ${requiredBundledAssets.length} required support assets are bundled locally`);
console.log(`OK: ${dataFiles.length} registered data files exist`);
if (pendingHiddenLinks.size) {
    console.log(`INFO: hidden pending pages: ${Array.from(pendingHiddenLinks).join(', ')}`);
}
