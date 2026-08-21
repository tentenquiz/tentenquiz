const fs = require('fs');
const path = require('path');

const {
    LANGUAGES,
    PROJECT_ROOT,
    getAuditionSamples,
    loadAzureSettings,
    loadGlobalData
} = require('./azure_tts_common');

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const settings = loadAzureSettings({ requireKey: false });
const rows = loadGlobalData();

assert(settings.region === 'koreacentral', 'Azure Speech region must be koreacentral');
assert(LANGUAGES.length === 12, 'exactly 12 learning languages are required');
assert(rows.length === 2500, 'exactly 2,500 vocabulary records are required');

const expectedAudioFields = new Set(LANGUAGES.map((language) => `audioFile_${language.suffix}`));
let emptyAudioFieldCount = 0;
for (const row of rows) {
    for (const field of expectedAudioFields) {
        assert(Object.prototype.hasOwnProperty.call(row, field), `${row.id} is missing ${field}`);
        if (String(row[field] || '').trim() === '') emptyAudioFieldCount++;
    }
}
assert(emptyAudioFieldCount === 30000, `all 30,000 audio fields must remain empty before voice approval: ${emptyAudioFieldCount}`);

for (const language of LANGUAGES) {
    const samples = getAuditionSamples(rows, language);
    assert(samples.length === 5, `${language.code} needs five audition words`);
    samples.forEach((sample) => assert(sample.speechText, `${language.code}/${sample.id} has no speech text`));
    if (language.code === 'ja') {
        assert(samples.every((sample) => sample.speechText === sample.readingText), 'Japanese audition must synthesize the reading, not kanji');
    }
}

const publicFiles = ['index.html', 'script.js', 'global-config.js', 'i18n.js'];
for (const fileName of publicFiles) {
    const source = fs.readFileSync(path.join(PROJECT_ROOT, fileName), 'utf8');
    assert(!/AZURE_SPEECH_KEY\s*=/.test(source), `${fileName} must not contain the Azure key`);
}

console.log('OK: koreacentral Azure Speech configuration');
console.log('OK: 12 languages × 2,500 records = 30,000 untouched audio fields');
console.log('OK: five audition words per language, with Japanese synthesized from hiragana readings');
console.log('OK: no Azure key reference in public application files');
