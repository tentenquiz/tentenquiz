const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
    DATA_FILES,
    PROJECT_ROOT,
    fetchVoiceCatalog,
    loadAzureSettings,
    synthesizeAuditionAudio
} = require('./azure_tts_common');

const RATE = '-12%';
const SPEED_PERCENT = 88;
const AUDIO_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';
const OUTPUT_FORMAT = { codec: 'mp3', sampleRate: 24000, channels: 1, bitrateKbps: 48 };
const SUMMARY_ROOT = path.resolve(PROJECT_ROOT, '..', 'tts-build', 'remaining-audio-88');

const LANGUAGES = [
    { code: 'en', suffix: 'en', locale: 'en-US', voice: 'en-US-JennyNeural', style: 'newscast' },
    { code: 'zh-CN', suffix: 'zh_cn', locale: 'zh-CN', voice: 'zh-CN-XiaoxiaoNeural', style: 'newscast' },
    { code: 'zh-TW', suffix: 'zh_tw', locale: 'zh-TW', voice: 'zh-TW-HsiaoChenNeural', style: '' },
    { code: 'fr', suffix: 'fr', locale: 'fr-FR', voice: 'fr-FR-DeniseNeural', style: '' },
    { code: 'de', suffix: 'de', locale: 'de-DE', voice: 'de-DE-KatjaNeural', style: '' },
    { code: 'es', suffix: 'es', locale: 'es-ES', voice: 'es-ES-ElviraNeural', style: '' },
    { code: 'vi', suffix: 'vi', locale: 'vi-VN', voice: 'vi-VN-HoaiMyNeural', style: '' },
    { code: 'ar', suffix: 'ar', locale: 'ar-SA', voice: 'ar-SA-ZariyahNeural', style: '' },
    { code: 'it', suffix: 'it', locale: 'it-IT', voice: 'it-IT-ElsaNeural', style: '' },
    { code: 'ru', suffix: 'ru', locale: 'ru-RU', voice: 'ru-RU-SvetlanaNeural', style: '' }
];

function parseArguments(argv) {
    const args = { commitData: false, concurrency: 8, dryRun: false, force: false, limit: 0 };
    for (let index = 0; index < argv.length; index++) {
        const value = argv[index];
        if (value === '--commit-data') args.commitData = true;
        else if (value === '--dry-run') args.dryRun = true;
        else if (value === '--force') args.force = true;
        else if (value === '--concurrency') {
            index++;
            args.concurrency = Number(argv[index]);
        } else if (value === '--limit') {
            index++;
            args.limit = Number(argv[index]);
        } else {
            throw new Error(`알 수 없는 옵션입니다: ${value}`);
        }
    }

    if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 16) {
        throw new Error('--concurrency는 1~16의 정수여야 합니다.');
    }
    if (!Number.isInteger(args.limit) || args.limit < 0) throw new Error('--limit은 0 이상의 정수여야 합니다.');
    if (args.commitData && args.limit) throw new Error('--limit을 사용할 때는 데이터를 연결할 수 없습니다.');
    return args;
}

function sha256File(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadSourceData() {
    const sources = DATA_FILES.map((fileName) => {
        const filePath = path.join(PROJECT_ROOT, 'data', fileName);
        const section = path.basename(fileName, '.json');
        const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!Array.isArray(rows) || rows.length !== 250) throw new Error(`${fileName}은 250개 JSON 배열이어야 합니다.`);
        return { fileName, filePath, section, rows, sourceSha256: sha256File(filePath) };
    });

    const seenIds = new Set();
    for (const source of sources) {
        source.rows.forEach((row) => {
            const id = String(row.id || '').trim();
            if (!id || seenIds.has(id)) throw new Error(`ID가 비어 있거나 중복됩니다: ${id || '(비어 있음)'}`);
            seenIds.add(id);
            if (row.section !== source.section) throw new Error(`${id}의 section 값이 ${source.section}과 다릅니다.`);
        });
    }
    if (seenIds.size !== 2500) throw new Error(`전체 ID는 2,500개여야 합니다. 현재: ${seenIds.size}`);

    const jobs = [];
    for (const language of LANGUAGES) {
        for (const source of sources) {
            source.rows.forEach((row, rowIndex) => {
                const id = String(row.id).trim();
                const speechText = String(row[`word_${language.suffix}`] || '').trim().normalize('NFC');
                const webAudioFile = `audio/${language.suffix}/${source.section}/${id}.mp3`;
                const outputFile = path.join(PROJECT_ROOT, 'audio', language.suffix, source.section, `${id}.mp3`);
                const field = `audioFile_${language.suffix}`;
                const existingPath = String(row[field] || '').trim();

                if (!speechText) throw new Error(`${id}의 word_${language.suffix}가 비어 있습니다.`);
                if (existingPath && existingPath !== webAudioFile) {
                    throw new Error(`${id}의 ${field} 경로가 규칙과 다릅니다: ${existingPath}`);
                }

                jobs.push({
                    language,
                    sourceFile: source.fileName,
                    rowIndex,
                    id,
                    section: source.section,
                    speechText,
                    webAudioFile,
                    outputFile
                });
            });
        }
    }

    if (jobs.length !== 25000) throw new Error(`남은 음성 생성 대상은 25,000개여야 합니다. 현재: ${jobs.length}`);
    return { sources, jobs };
}

function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRetryable(error) {
    return /\((408|409|429|5\d\d)\)|fetch failed|ECONN|ETIMEDOUT|socket|network/i.test(String(error && error.message));
}

async function synthesizeWithRetry(settings, voice, job, attempts = 7) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await synthesizeAuditionAudio(
                settings,
                voice,
                job.language,
                [{ speechText: job.speechText }],
                { rate: RATE, style: job.language.style, styleDegree: 1 }
            );
        } catch (error) {
            lastError = error;
            if (!isRetryable(error) || attempt === attempts) break;
            const delay = Math.min(15000, 600 * (2 ** (attempt - 1))) + Math.floor(Math.random() * 400);
            await sleep(delay);
        }
    }
    throw new Error(`${job.language.code}/${job.id}/${job.speechText}: ${lastError.message}`);
}

function findMp3Frame(buffer) {
    let start = 0;
    if (buffer.length >= 10 && buffer.subarray(0, 3).toString('ascii') === 'ID3') {
        const tagSize = ((buffer[6] & 0x7f) << 21)
            | ((buffer[7] & 0x7f) << 14)
            | ((buffer[8] & 0x7f) << 7)
            | (buffer[9] & 0x7f);
        start = 10 + tagSize;
    }

    const scanEnd = Math.min(buffer.length - 4, start + 65536);
    for (let offset = start; offset <= scanEnd; offset++) {
        const b1 = buffer[offset + 1];
        const b2 = buffer[offset + 2];
        const b3 = buffer[offset + 3];
        if (buffer[offset] !== 0xff || (b1 & 0xe0) !== 0xe0) continue;

        const versionBits = (b1 >> 3) & 0x03;
        const layerBits = (b1 >> 1) & 0x03;
        const bitrateIndex = (b2 >> 4) & 0x0f;
        const sampleRateIndex = (b2 >> 2) & 0x03;
        if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) continue;

        const rates = {
            3: [44100, 48000, 32000],
            2: [22050, 24000, 16000],
            0: [11025, 12000, 8000]
        };
        const mpeg1Layer3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
        const mpeg2Layer3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
        const sampleRate = rates[versionBits][sampleRateIndex];
        const bitrateKbps = (versionBits === 3 ? mpeg1Layer3 : mpeg2Layer3)[bitrateIndex];
        const channelMode = (b3 >> 6) & 0x03;
        return { sampleRate, bitrateKbps, channels: channelMode === 3 ? 1 : 2 };
    }
    return null;
}

function inspectMp3File(filePath) {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 1000) return { valid: false, reason: `파일 크기 ${buffer.length}` };
    const frame = findMp3Frame(buffer);
    if (!frame) return { valid: false, reason: 'MP3 프레임 헤더 없음' };
    if (frame.sampleRate !== OUTPUT_FORMAT.sampleRate) return { valid: false, reason: `샘플레이트 ${frame.sampleRate}` };
    if (frame.channels !== OUTPUT_FORMAT.channels) return { valid: false, reason: `채널 ${frame.channels}` };
    if (frame.bitrateKbps !== OUTPUT_FORMAT.bitrateKbps) return { valid: false, reason: `비트레이트 ${frame.bitrateKbps}` };
    const estimatedDuration = (buffer.length * 8) / (frame.bitrateKbps * 1000);
    if (estimatedDuration < 0.5 || estimatedDuration > 12) {
        return { valid: false, reason: `예상 길이 ${estimatedDuration.toFixed(3)}초` };
    }
    return { valid: true, bytes: buffer.length, estimatedDuration };
}

function verifyAllFiles(jobs) {
    let bytes = 0;
    let minDuration = Number.POSITIVE_INFINITY;
    let maxDuration = 0;
    const invalid = [];
    for (const job of jobs) {
        if (!fs.existsSync(job.outputFile)) {
            invalid.push({ id: job.id, language: job.language.code, reason: '파일 없음' });
            continue;
        }
        const result = inspectMp3File(job.outputFile);
        if (!result.valid) {
            invalid.push({ id: job.id, language: job.language.code, reason: result.reason });
            continue;
        }
        bytes += result.bytes;
        minDuration = Math.min(minDuration, result.estimatedDuration);
        maxDuration = Math.max(maxDuration, result.estimatedDuration);
    }
    if (invalid.length) throw new Error(`MP3 전수 검사 실패 ${invalid.length}개: ${JSON.stringify(invalid.slice(0, 20))}`);
    return { checked: jobs.length, bytes, minEstimatedDuration: minDuration, maxEstimatedDuration: maxDuration };
}

function makeTimestamp() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function commitAudioPaths(sources) {
    const backupRoot = path.join(PROJECT_ROOT, 'backups', `before-remaining-audio-${makeTimestamp()}`);
    fs.mkdirSync(backupRoot, { recursive: true });
    sources.forEach((source) => fs.copyFileSync(source.filePath, path.join(backupRoot, source.fileName)));

    for (const source of sources) {
        source.rows.forEach((row) => {
            for (const language of LANGUAGES) {
                row[`audioFile_${language.suffix}`] = `audio/${language.suffix}/${source.section}/${row.id}.mp3`;
            }
        });
        fs.writeFileSync(source.filePath, `${JSON.stringify(source.rows, null, 2)}\n`, 'utf8');
    }
    return backupRoot;
}

async function generateLanguage(settings, voice, jobs, args, totals) {
    let nextIndex = 0;
    const failures = [];

    async function worker() {
        while (true) {
            const index = nextIndex++;
            if (index >= jobs.length) return;
            const job = jobs[index];
            try {
                fs.mkdirSync(path.dirname(job.outputFile), { recursive: true });
                if (!args.force && fs.existsSync(job.outputFile)) {
                    const existing = inspectMp3File(job.outputFile);
                    if (existing.valid) {
                        totals.retained++;
                    } else {
                        const audio = await synthesizeWithRetry(settings, voice, job);
                        fs.writeFileSync(job.outputFile, audio);
                        totals.generated++;
                    }
                } else {
                    const audio = await synthesizeWithRetry(settings, voice, job);
                    fs.writeFileSync(job.outputFile, audio);
                    totals.generated++;
                }
            } catch (error) {
                failures.push({ language: job.language.code, id: job.id, message: error.message });
            } finally {
                totals.completed++;
                if (totals.completed === totals.target || totals.completed % 100 === 0) {
                    console.log(`[${totals.completed}/${totals.target}] 생성 ${totals.generated}, 기존 유지 ${totals.retained}, 실패 ${totals.failures + failures.length}`);
                }
            }
        }
    }

    await Promise.all(Array.from({ length: args.concurrency }, () => worker()));
    totals.failures += failures.length;
    return failures;
}

function writeSummary(settings, sources, stats, verification, backupRoot) {
    fs.mkdirSync(SUMMARY_ROOT, { recursive: true });
    const summary = {
        version: 1,
        generatedAt: new Date().toISOString(),
        region: settings.region,
        speedPercent: SPEED_PERCENT,
        rate: RATE,
        format: AUDIO_FORMAT,
        languages: LANGUAGES.map((language) => ({
            code: language.code,
            suffix: language.suffix,
            locale: language.locale,
            voice: language.voice,
            style: language.style || 'neutral',
            files: 2500
        })),
        stats,
        verification,
        backupRoot,
        sourceFilesBeforeCommit: sources.map((source) => ({ fileName: source.fileName, sha256: source.sourceSha256 }))
    };
    const summaryFile = path.join(SUMMARY_ROOT, 'generation-summary.json');
    fs.writeFileSync(summaryFile, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    return summaryFile;
}

async function main() {
    const args = parseArguments(process.argv.slice(2));
    const { sources, jobs: allJobs } = loadSourceData();
    const jobs = args.limit ? allJobs.slice(0, args.limit) : allJobs;
    const totalCharacters = jobs.reduce((sum, job) => sum + [...job.speechText].length, 0);
    console.log(`남은 언어 ${LANGUAGES.length}개, 음성 ${jobs.length}개, 입력 ${totalCharacters}자, 속도 ${SPEED_PERCENT}%`);

    if (args.dryRun) {
        console.log('DRY RUN: API 키, 네트워크, 음성 파일, JSON 데이터를 변경하지 않았습니다.');
        return;
    }

    const settings = loadAzureSettings();
    if (settings.region !== 'koreacentral') throw new Error(`Azure 지역은 koreacentral이어야 합니다: ${settings.region}`);
    const catalog = await fetchVoiceCatalog(settings);
    const voiceMap = new Map();
    for (const language of LANGUAGES) {
        const voice = catalog.find((item) => item.ShortName === language.voice);
        if (!voice) throw new Error(`${language.voice} 음성을 찾지 못했습니다.`);
        if (voice.Locale !== language.locale || String(voice.Gender).toLowerCase() !== 'female') {
            throw new Error(`${language.voice}의 언어 또는 성별 정보가 예상과 다릅니다.`);
        }
        if (language.style && (!Array.isArray(voice.StyleList) || !voice.StyleList.includes(language.style))) {
            throw new Error(`${language.voice}는 ${language.style} 스타일을 지원하지 않습니다.`);
        }
        voiceMap.set(language.code, voice);
    }

    const totals = { target: jobs.length, completed: 0, generated: 0, retained: 0, failures: 0 };
    const allFailures = [];
    for (const language of LANGUAGES) {
        const languageJobs = jobs.filter((job) => job.language.code === language.code);
        if (!languageJobs.length) continue;
        const failures = await generateLanguage(settings, voiceMap.get(language.code), languageJobs, args, totals);
        allFailures.push(...failures);
    }
    if (allFailures.length) {
        throw new Error(`음성 생성 ${allFailures.length}개 실패. JSON은 연결하지 않았습니다: ${JSON.stringify(allFailures.slice(0, 20))}`);
    }

    const verification = verifyAllFiles(jobs);
    let backupRoot = '';
    if (args.commitData) {
        if (args.limit || jobs.length !== 25000) throw new Error('25,000개 전체 작업이 아니므로 JSON을 연결할 수 없습니다.');
        backupRoot = commitAudioPaths(sources);
        console.log(`남은 오디오 필드 25,000개 연결 완료. 백업: ${backupRoot}`);
    }

    const summaryFile = writeSummary(settings, sources, totals, verification, backupRoot);
    console.log(`생성 요약: ${summaryFile}`);
    console.log(`완료: 생성 ${totals.generated}, 기존 유지 ${totals.retained}, 실패 0, MP3 검사 ${verification.checked}`);
}

main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
});
