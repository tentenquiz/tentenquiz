const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_PARENT = path.resolve(PROJECT_ROOT, '..');
const DEFAULT_SECRET_FILE = path.join(PROJECT_PARENT, '.secrets', 'azure-speech.env');
const DEFAULT_REVIEW_ROOT = path.join(PROJECT_PARENT, 'tts-review', 'azure-voice-audition');

const DATA_FILES = [
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

const SAMPLE_IDS = ['pr_0001', 'pr_0026', 'hdl_0111', 'sw_0191', 'nw_0196'];

const LANGUAGES = [
    { code: 'en', suffix: 'en', label: 'English', locale: 'en-US', preferred: ['en-US-JennyNeural', 'en-US-GuyNeural'] },
    { code: 'ko', suffix: 'ko', label: '한국어', locale: 'ko-KR', preferred: ['ko-KR-SunHiNeural', 'ko-KR-InJoonNeural'] },
    { code: 'ja', suffix: 'ja', label: '日本語', locale: 'ja-JP', preferred: ['ja-JP-NanamiNeural', 'ja-JP-KeitaNeural'] },
    { code: 'zh-CN', directory: 'zh-cn', suffix: 'zh_cn', label: '简体中文', locale: 'zh-CN', preferred: ['zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural'] },
    { code: 'zh-TW', directory: 'zh-tw', suffix: 'zh_tw', label: '繁體中文', locale: 'zh-TW', preferred: ['zh-TW-HsiaoChenNeural', 'zh-TW-YunJheNeural'] },
    { code: 'fr', suffix: 'fr', label: 'Français', locale: 'fr-FR', preferred: ['fr-FR-DeniseNeural', 'fr-FR-HenriNeural'] },
    { code: 'de', suffix: 'de', label: 'Deutsch', locale: 'de-DE', preferred: ['de-DE-KatjaNeural', 'de-DE-ConradNeural'] },
    { code: 'es', suffix: 'es', label: 'Español', locale: 'es-ES', preferred: ['es-ES-ElviraNeural', 'es-ES-AlvaroNeural'] },
    { code: 'vi', suffix: 'vi', label: 'Tiếng Việt', locale: 'vi-VN', preferred: ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'] },
    { code: 'ar', suffix: 'ar', label: 'العربية', locale: 'ar-SA', preferred: ['ar-SA-ZariyahNeural', 'ar-SA-HamedNeural'] },
    { code: 'it', suffix: 'it', label: 'Italiano', locale: 'it-IT', preferred: ['it-IT-ElsaNeural', 'it-IT-DiegoNeural'] },
    { code: 'ru', suffix: 'ru', label: 'Русский', locale: 'ru-RU', preferred: ['ru-RU-SvetlanaNeural', 'ru-RU-DmitryNeural'] }
].map((language) => ({ ...language, directory: language.directory || language.code.toLowerCase() }));

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};

    const values = {};
    const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    for (const rawLine of source.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const equalsIndex = line.indexOf('=');
        if (equalsIndex < 1) continue;

        const key = line.slice(0, equalsIndex).trim();
        let value = line.slice(equalsIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        values[key] = value;
    }
    return values;
}

function loadAzureSettings(options = {}) {
    const secretFile = path.resolve(options.secretFile || process.env.AZURE_SPEECH_ENV_FILE || DEFAULT_SECRET_FILE);
    const fileValues = parseEnvFile(secretFile);
    const key = String(process.env.AZURE_SPEECH_KEY || fileValues.AZURE_SPEECH_KEY || '').trim();
    const region = String(process.env.AZURE_SPEECH_REGION || fileValues.AZURE_SPEECH_REGION || 'koreacentral').trim().toLowerCase();
    const customEndpoint = String(process.env.AZURE_SPEECH_ENDPOINT || fileValues.AZURE_SPEECH_ENDPOINT || '').trim().replace(/\/$/, '');

    if (!/^[a-z0-9-]+$/.test(region)) {
        throw new Error(`Azure 지역 코드가 올바르지 않습니다: ${region || '(비어 있음)'}`);
    }

    if (options.requireKey !== false) {
        if (!key || /PASTE|REPLACE|여기에|입력/i.test(key)) {
            throw new Error(`Azure Speech API 키가 설정되지 않았습니다. 비밀 설정 파일을 확인하세요: ${secretFile}`);
        }
        if (key.length < 20) {
            throw new Error('Azure Speech API 키가 너무 짧습니다. Keys and Endpoint의 KEY 1 또는 KEY 2를 확인하세요.');
        }
    }

    const baseEndpoint = customEndpoint || `https://${region}.tts.speech.microsoft.com`;
    return {
        key,
        region,
        secretFile,
        voicesEndpoint: `${baseEndpoint}/cognitiveservices/voices/list`,
        synthesisEndpoint: `${baseEndpoint}/cognitiveservices/v1`
    };
}

function loadGlobalData() {
    const rows = [];
    for (const fileName of DATA_FILES) {
        const filePath = path.join(PROJECT_ROOT, 'data', fileName);
        if (!fs.existsSync(filePath)) throw new Error(`데이터 파일을 찾을 수 없습니다: ${filePath}`);

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!Array.isArray(data) || data.length !== 250) {
            throw new Error(`${fileName}은 250개 배열이어야 합니다.`);
        }
        data.forEach((row) => rows.push({ ...row, sourceFile: fileName }));
    }
    if (rows.length !== 2500) throw new Error(`전체 데이터는 2,500개여야 합니다. 현재: ${rows.length}`);
    return rows;
}

function getAuditionSamples(rows, language) {
    const byId = new Map(rows.map((row) => [String(row.id), row]));
    return SAMPLE_IDS.map((id) => {
        const row = byId.get(id);
        if (!row) throw new Error(`비교용 표본 ID를 찾을 수 없습니다: ${id}`);

        const displayText = String(row[`word_${language.suffix}`] || '').trim();
        const readingText = String(row[`reading_${language.suffix}`] || displayText).trim();
        const speechText = language.code === 'ja' ? readingText : displayText;
        if (!displayText || !speechText) throw new Error(`${id}의 ${language.code} 표본 단어가 비어 있습니다.`);

        return {
            id,
            stage: Number(row.stage),
            sourceFile: row.sourceFile,
            displayText,
            speechText,
            readingText
        };
    });
}

function isStandardNeuralVoice(voice) {
    const shortName = String(voice.ShortName || '');
    return shortName.endsWith('Neural')
        && !/Multilingual|Dragon|Turbo|HD/i.test(shortName)
        && !/deprecated/i.test(String(voice.Status || ''));
}

function chooseCandidateVoices(voices, language) {
    const localeVoices = voices
        .filter((voice) => String(voice.Locale || '').toLowerCase() === language.locale.toLowerCase())
        .filter(isStandardNeuralVoice)
        .sort((a, b) => String(a.ShortName).localeCompare(String(b.ShortName), 'en'));

    if (!localeVoices.length) {
        throw new Error(`${language.locale}에서 사용할 수 있는 표준 Neural 음성을 찾지 못했습니다.`);
    }

    const chosen = [];
    const addVoice = (voice) => {
        if (voice && !chosen.some((item) => item.ShortName === voice.ShortName)) chosen.push(voice);
    };

    language.preferred.forEach((shortName) => addVoice(localeVoices.find((voice) => voice.ShortName === shortName)));
    addVoice(localeVoices.find((voice) => String(voice.Gender).toLowerCase() === 'female'));
    addVoice(localeVoices.find((voice) => String(voice.Gender).toLowerCase() === 'male'));
    localeVoices.forEach(addVoice);

    return chosen.slice(0, 2);
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildAuditionSsml(locale, voiceName, samples, options = {}) {
    const rate = String(options.rate || '-5%');
    const style = String(options.style || '').trim();
    const styleDegree = Number(options.styleDegree || 1);
    const items = samples.map((sample, index) => {
        const pause = index < samples.length - 1 ? '<break time="700ms"/>' : '';
        return `<prosody rate="${escapeXml(rate)}">${escapeXml(sample.speechText)}</prosody>${pause}`;
    }).join('');

    const styledItems = style
        ? `<mstts:express-as style="${escapeXml(style)}" styledegree="${escapeXml(styleDegree)}">${items}</mstts:express-as>`
        : items;
    const msttsNamespace = style ? ' xmlns:mstts="http://www.w3.org/2001/mstts"' : '';

    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"${msttsNamespace} xml:lang="${escapeXml(locale)}"><voice name="${escapeXml(voiceName)}">${styledItems}</voice></speak>`;
}

async function fetchVoiceCatalog(settings) {
    const response = await fetch(settings.voicesEndpoint, {
        headers: {
            'Ocp-Apim-Subscription-Key': settings.key,
            'User-Agent': 'TentenQuizAudioBuilder/1.0'
        }
    });
    if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        throw new Error(`Azure 음성 목록 요청 실패 (${response.status}): ${detail}`);
    }

    const voices = await response.json();
    if (!Array.isArray(voices)) throw new Error('Azure 음성 목록 응답이 배열이 아닙니다.');
    return voices;
}

async function synthesizeAuditionAudio(settings, voice, language, samples, options = {}) {
    const response = await fetch(settings.synthesisEndpoint, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': settings.key,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'User-Agent': 'TentenQuizAudioBuilder/1.0'
        },
        body: buildAuditionSsml(language.locale, voice.ShortName, samples, options)
    });
    if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        throw new Error(`${language.code}/${voice.ShortName} 음성 생성 실패 (${response.status}): ${detail}`);
    }

    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length < 1000) throw new Error(`${language.code}/${voice.ShortName} 음성 파일이 비정상적으로 작습니다.`);
    return audio;
}

module.exports = {
    DATA_FILES,
    DEFAULT_REVIEW_ROOT,
    DEFAULT_SECRET_FILE,
    LANGUAGES,
    PROJECT_ROOT,
    buildAuditionSsml,
    chooseCandidateVoices,
    fetchVoiceCatalog,
    getAuditionSamples,
    loadAzureSettings,
    loadGlobalData,
    synthesizeAuditionAudio
};
