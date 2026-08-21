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

const LANGUAGE = { code: 'ja', suffix: 'ja', label: '일본어', locale: 'ja-JP' };
const VOICE_NAME = 'ja-JP-NanamiNeural';
const RATE = '-12%';
const SPEED_PERCENT = 88;
const OUTPUT_ROOT = path.join(PROJECT_ROOT, 'audio', 'ja');
const REVIEW_ROOT = path.resolve(PROJECT_ROOT, '..', 'tts-review', 'japanese-audio-88');
const OVERRIDE_FILE = path.join(__dirname, 'pronunciation-overrides.ja.json');

function parseArguments(argv) {
    const args = {
        commitData: false,
        concurrency: 6,
        dryRun: false,
        force: false,
        limit: 0,
        packageReview: true
    };

    for (let index = 0; index < argv.length; index++) {
        const value = argv[index];
        if (value === '--commit-data') args.commitData = true;
        else if (value === '--dry-run') args.dryRun = true;
        else if (value === '--force') args.force = true;
        else if (value === '--skip-review-package') args.packageReview = false;
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

    if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 12) {
        throw new Error('--concurrency는 1~12의 정수여야 합니다.');
    }
    if (!Number.isInteger(args.limit) || args.limit < 0) {
        throw new Error('--limit은 0 이상의 정수여야 합니다.');
    }
    if (args.commitData && args.limit) {
        throw new Error('--limit을 사용할 때는 데이터를 연결할 수 없습니다.');
    }
    return args;
}

function sha256File(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadOverrides() {
    if (!fs.existsSync(OVERRIDE_FILE)) return {};
    const payload = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf8'));
    if (payload.locale !== LANGUAGE.locale || payload.voice !== VOICE_NAME) {
        throw new Error('일본어 발음 재정의 파일의 locale 또는 voice가 현재 설정과 다릅니다.');
    }
    const overrides = payload.overrides || {};
    for (const [id, item] of Object.entries(overrides)) {
        if (!item || typeof item.speechText !== 'string' || !item.speechText.trim()) {
            throw new Error(`발음 재정의 ${id}에 speechText가 없습니다.`);
        }
    }
    return overrides;
}

function loadSourceData(overrides) {
    const sources = [];
    const jobs = [];
    const seenIds = new Set();

    for (const fileName of DATA_FILES) {
        const filePath = path.join(PROJECT_ROOT, 'data', fileName);
        const section = path.basename(fileName, '.json');
        const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!Array.isArray(rows) || rows.length !== 250) {
            throw new Error(`${fileName}은 250개 JSON 배열이어야 합니다.`);
        }

        rows.forEach((row, rowIndex) => {
            const id = String(row.id || '').trim();
            const displayText = String(row.word_ja || '').trim().normalize('NFC');
            const readingText = String(row.reading_ja || '').trim().normalize('NFC');
            const override = overrides[id] || null;
            const speechText = String(override ? override.speechText : readingText).trim().normalize('NFC');
            const webAudioFile = `audio/ja/${section}/${id}.mp3`;
            const outputFile = path.join(OUTPUT_ROOT, section, `${id}.mp3`);

            if (!id || seenIds.has(id)) throw new Error(`ID가 비어 있거나 중복됩니다: ${id || '(비어 있음)'}`);
            seenIds.add(id);
            if (row.section !== section) throw new Error(`${id}의 section 값이 ${section}과 다릅니다.`);
            if (!displayText || !readingText || !speechText) throw new Error(`${id}의 일본어 음성 입력이 비어 있습니다.`);
            if (!/^[ぁ-ゖゝゞ]+$/.test(readingText)) throw new Error(`${id}의 reading_ja가 히라가나 전용이 아닙니다.`);
            if (/[ァ-ヶー]/.test(displayText + readingText)) throw new Error(`${id}의 일본어 표제어 또는 읽기에 가타카나가 있습니다.`);
            if (/[\\/:*?"<>|]/.test(speechText)) throw new Error(`${id}의 음성 입력에 허용하지 않는 문자가 있습니다.`);
            if (row.audioFile_ja && row.audioFile_ja !== webAudioFile) {
                throw new Error(`${id}의 기존 audioFile_ja 경로가 규칙과 다릅니다: ${row.audioFile_ja}`);
            }

            jobs.push({
                id,
                section,
                stage: Number(row.stage),
                sourceFile: fileName,
                rowIndex,
                displayText,
                readingText,
                speechText,
                meaningEn: String(row.word_en || '').trim(),
                noteKo: String(row.note_ko || '').trim(),
                overridden: Boolean(override),
                overrideReason: override ? String(override.reason || '').trim() : '',
                webAudioFile,
                outputFile
            });
        });

        sources.push({
            fileName,
            filePath,
            section,
            rows,
            sourceSha256: sha256File(filePath)
        });
    }

    if (jobs.length !== 2500) throw new Error(`일본어 생성 대상은 2,500개여야 합니다. 현재: ${jobs.length}`);
    return { sources, jobs };
}

function addRiskFlags(jobs) {
    const byReading = new Map();
    for (const job of jobs) {
        if (!byReading.has(job.readingText)) byReading.set(job.readingText, []);
        byReading.get(job.readingText).push(job);
    }

    for (const job of jobs) {
        const reasons = [];
        const sameReading = byReading.get(job.readingText);
        const meanings = new Set(sameReading.map((item) => item.meaningEn.toLocaleLowerCase('en')));
        const headwords = new Set(sameReading.map((item) => item.displayText));
        if (meanings.size > 1 || headwords.size > 1) reasons.push('같은 읽기·다른 표기 또는 의미');
        if (job.readingText.length <= 2) reasons.push('짧은 읽기');
        if (job.readingText.length >= 9) reasons.push('긴 읽기');
        if (job.overridden) reasons.push('발음 재정의 적용');
        job.riskReasons = reasons;
    }
}

function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRetryable(error) {
    return /\((429|5\d\d)\)|fetch failed|ECONN|ETIMEDOUT|socket|network/i.test(String(error && error.message));
}

async function synthesizeWithRetry(settings, voice, job, attempts = 5) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await synthesizeAuditionAudio(
                settings,
                voice,
                LANGUAGE,
                [{ speechText: job.speechText }],
                { rate: RATE }
            );
        } catch (error) {
            lastError = error;
            if (!isRetryable(error) || attempt === attempts) break;
            const delay = 500 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 300);
            await sleep(delay);
        }
    }
    throw new Error(`${job.id}/${job.readingText}: ${lastError.message}`);
}

async function generateAll(settings, voice, jobs, args) {
    let nextIndex = 0;
    let completed = 0;
    let generated = 0;
    let retained = 0;
    const failures = [];

    async function worker() {
        while (true) {
            const index = nextIndex++;
            if (index >= jobs.length) return;
            const job = jobs[index];

            try {
                fs.mkdirSync(path.dirname(job.outputFile), { recursive: true });
                if (!args.force && fs.existsSync(job.outputFile) && fs.statSync(job.outputFile).size >= 1000) {
                    retained++;
                } else {
                    const audio = await synthesizeWithRetry(settings, voice, job);
                    fs.writeFileSync(job.outputFile, audio);
                    generated++;
                }
            } catch (error) {
                failures.push({ id: job.id, message: error.message });
            } finally {
                completed++;
                if (completed === jobs.length || completed % 25 === 0) {
                    console.log(`[${completed}/${jobs.length}] 생성 ${generated}, 기존 유지 ${retained}, 실패 ${failures.length}`);
                }
            }
        }
    }

    await Promise.all(Array.from({ length: args.concurrency }, () => worker()));
    if (failures.length) {
        throw new Error(`음성 생성 ${failures.length}개 실패: ${JSON.stringify(failures.slice(0, 10))}`);
    }
    return { generated, retained };
}

function verifyGeneratedFiles(jobs) {
    const invalid = [];
    for (const job of jobs) {
        if (!fs.existsSync(job.outputFile)) {
            invalid.push({ id: job.id, reason: '파일 없음' });
            continue;
        }
        const size = fs.statSync(job.outputFile).size;
        if (size < 1000) invalid.push({ id: job.id, reason: `파일 크기 ${size}` });
    }
    if (invalid.length) throw new Error(`생성 파일 기본 검사 실패: ${JSON.stringify(invalid.slice(0, 20))}`);
}

function makeTimestamp() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function commitAudioPaths(sources, jobs) {
    const backupRoot = path.join(PROJECT_ROOT, 'backups', `before-ja-audio-${makeTimestamp()}`);
    fs.mkdirSync(backupRoot, { recursive: true });
    sources.forEach((source) => fs.copyFileSync(source.filePath, path.join(backupRoot, source.fileName)));

    const jobsByFile = new Map();
    for (const job of jobs) {
        if (!jobsByFile.has(job.sourceFile)) jobsByFile.set(job.sourceFile, []);
        jobsByFile.get(job.sourceFile).push(job);
    }

    for (const source of sources) {
        const fileJobs = jobsByFile.get(source.fileName) || [];
        for (const job of fileJobs) source.rows[job.rowIndex].audioFile_ja = job.webAudioFile;
        fs.writeFileSync(source.filePath, `${JSON.stringify(source.rows, null, 2)}\n`, 'utf8');
    }
    return backupRoot;
}

function csvEscape(value) {
    const text = String(value == null ? '' : value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function createReviewHtml(manifest) {
    const pageData = {
        voice: manifest.voice,
        rate: manifest.rate,
        speedPercent: manifest.speedPercent,
        generatedAt: manifest.generatedAt,
        items: manifest.items.map((item) => ({
            id: item.id,
            section: item.section,
            stage: item.stage,
            word: item.displayText,
            reading: item.speechText,
            note: item.noteKo,
            audioFile: item.reviewAudioFile,
            riskReasons: item.riskReasons
        }))
    };
    const json = JSON.stringify(pageData).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TentenQuiz 일본어 음성 전수 검수</title>
    <style>
        :root { color-scheme:light; --wine:#752525; --cream:#fff8ed; --paper:#fff; --line:#e9d8ca; --muted:#70645d; --ok:#25663c; --issue:#a33a2d; }
        * { box-sizing:border-box; }
        body { margin:0; background:var(--cream); color:#28231f; font-family:"Pretendard","Noto Sans KR","Malgun Gothic",sans-serif; line-height:1.5; }
        main { width:min(1060px,calc(100% - 28px)); margin:26px auto 60px; }
        .hero,.toolbar,.item,.pager { border:1px solid var(--line); background:var(--paper); border-radius:18px; }
        .hero { padding:25px; }
        h1 { margin:0 0 8px; color:var(--wine); }
        .hero p { margin:7px 0; }
        .meta { color:var(--muted); font-size:14px; }
        .toolbar { position:sticky; top:8px; z-index:4; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:16px 0; padding:14px; box-shadow:0 8px 24px rgba(70,40,20,.08); }
        select,button { min-height:42px; border:1px solid var(--line); border-radius:12px; background:#fff; padding:8px 11px; font:inherit; }
        button { cursor:pointer; font-weight:750; }
        .status { grid-column:1/-1; color:var(--muted); font-size:14px; }
        .list { display:grid; gap:10px; }
        .item { display:grid; grid-template-columns:minmax(180px,.8fr) minmax(260px,1.2fr) minmax(250px,1fr); gap:15px; padding:16px; }
        .word h2 { margin:0; color:var(--wine); font-size:22px; }
        .word small,.note,.risk { color:var(--muted); }
        .risk { margin-top:6px; font-size:13px; }
        audio { width:100%; }
        .review-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .review-actions button.is-selected[data-status="ok"] { color:#fff; background:var(--ok); border-color:var(--ok); }
        .review-actions button.is-selected[data-status="issue"] { color:#fff; background:var(--issue); border-color:var(--issue); }
        .pager { display:flex; justify-content:center; align-items:center; gap:12px; margin-top:14px; padding:13px; }
        .empty { padding:30px; text-align:center; color:var(--muted); }
        @media (max-width:760px) { .toolbar{grid-template-columns:1fr 1fr}.item{grid-template-columns:1fr}.hero{padding:20px} }
    </style>
</head>
<body>
<main>
    <section class="hero">
        <h1>일본어 음성 전수 검수</h1>
        <p>히라가나 읽기와 한자 표제어의 뜻을 확인하며 듣고 <b>정상</b> 또는 <b>재생성 필요</b>를 표시하세요. 위험 후보부터 먼저 들을 수 있습니다.</p>
        <div class="meta">${VOICE_NAME} · 기본 속도의 ${SPEED_PERCENT}% · 2,500개 · API 키 미포함</div>
    </section>
    <section class="toolbar">
        <select id="section-filter" aria-label="섹션"><option value="">모든 섹션</option></select>
        <select id="stage-filter" aria-label="스테이지"><option value="">모든 스테이지</option></select>
        <select id="review-filter" aria-label="검수 상태">
            <option value="">전체 음성</option><option value="risk">위험 후보</option><option value="unreviewed">미검수</option><option value="issue">재생성 필요</option>
        </select>
        <button id="export" type="button">검수 결과 저장</button>
        <div class="status" id="status"></div>
    </section>
    <section class="list" id="list"></section>
    <nav class="pager"><button id="prev" type="button">이전</button><span id="page"></span><button id="next" type="button">다음</button></nav>
</main>
<script type="application/json" id="review-data">${json}</script>
<script>
(() => {
    const data = JSON.parse(document.getElementById('review-data').textContent);
    const storageKey = 'tentenquiz.jaAudioReview.v1';
    const pageSize = 25;
    let page = 1;
    const list = document.getElementById('list');
    const sectionFilter = document.getElementById('section-filter');
    const stageFilter = document.getElementById('stage-filter');
    const reviewFilter = document.getElementById('review-filter');
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const load = () => { try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; } };
    const save = (value) => localStorage.setItem(storageKey, JSON.stringify(value));
    [...new Set(data.items.map((item) => item.section))].forEach((value) => sectionFilter.insertAdjacentHTML('beforeend', '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>'));
    for (let stage = 1; stage <= 10; stage++) stageFilter.insertAdjacentHTML('beforeend', '<option value="' + stage + '">Stage ' + stage + '</option>');
    const filtered = () => {
        const review = load();
        return data.items.filter((item) => {
            if (sectionFilter.value && item.section !== sectionFilter.value) return false;
            if (stageFilter.value && Number(item.stage) !== Number(stageFilter.value)) return false;
            if (reviewFilter.value === 'risk' && !item.riskReasons.length) return false;
            if (reviewFilter.value === 'unreviewed' && review[item.id]) return false;
            if (reviewFilter.value === 'issue' && (!review[item.id] || review[item.id].status !== 'issue')) return false;
            return true;
        });
    };
    const render = () => {
        const review = load();
        const items = filtered();
        const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
        page = Math.min(page, totalPages);
        const visible = items.slice((page - 1) * pageSize, page * pageSize);
        list.innerHTML = visible.length ? visible.map((item) => {
            const selected = review[item.id] && review[item.id].status;
            const risk = item.riskReasons.length ? '<div class="risk">우선 확인: ' + escapeHtml(item.riskReasons.join(', ')) + '</div>' : '';
            return '<article class="item"><div class="word"><h2>' + escapeHtml(item.reading) + '</h2><small>' + escapeHtml(item.word + ' · ' + item.id + ' · ' + item.section + ' · Stage ' + item.stage) + '</small>' + risk + '</div><div><audio controls preload="none" src="' + escapeHtml(item.audioFile) + '"></audio><p class="note">' + escapeHtml(item.note) + '</p></div><div class="review-actions"><button type="button" data-id="' + escapeHtml(item.id) + '" data-status="ok" class="' + (selected === 'ok' ? 'is-selected' : '') + '">정상</button><button type="button" data-id="' + escapeHtml(item.id) + '" data-status="issue" class="' + (selected === 'issue' ? 'is-selected' : '') + '">재생성 필요</button></div></article>';
        }).join('') : '<div class="empty">조건에 맞는 음성이 없습니다.</div>';
        const reviewedCount = Object.keys(review).length;
        const issueCount = Object.values(review).filter((item) => item.status === 'issue').length;
        document.getElementById('status').textContent = '표시 ' + items.length + '개 · 전체 검수 ' + reviewedCount + ' / ' + data.items.length + ' · 재생성 필요 ' + issueCount + '개';
        document.getElementById('page').textContent = page + ' / ' + totalPages;
        document.getElementById('prev').disabled = page <= 1;
        document.getElementById('next').disabled = page >= totalPages;
    };
    list.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-id][data-status]');
        if (!button) return;
        const review = load();
        review[button.dataset.id] = { status:button.dataset.status, updatedAt:new Date().toISOString() };
        save(review); render();
    });
    [sectionFilter,stageFilter,reviewFilter].forEach((element) => element.addEventListener('change', () => { page=1; render(); }));
    document.getElementById('prev').addEventListener('click', () => { page--; render(); window.scrollTo({top:0,behavior:'smooth'}); });
    document.getElementById('next').addEventListener('click', () => { page++; render(); window.scrollTo({top:0,behavior:'smooth'}); });
    document.getElementById('export').addEventListener('click', () => {
        const payload = JSON.stringify({ voice:data.voice, rate:data.rate, exportedAt:new Date().toISOString(), results:load() }, null, 2);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([payload], {type:'application/json'}));
        link.download = 'tentenquiz-ja-audio-review.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    render();
})();
</script>
</body>
</html>`;
}

function writeReviewPackage(settings, jobs, sources, generationStats, packageAudio) {
    fs.mkdirSync(REVIEW_ROOT, { recursive: true });
    const generatedAt = new Date().toISOString();
    const items = jobs.map((job) => ({
        id: job.id,
        section: job.section,
        stage: job.stage,
        displayText: job.displayText,
        speechText: job.speechText,
        noteKo: job.noteKo,
        riskReasons: job.riskReasons,
        overridden: job.overridden,
        webAudioFile: job.webAudioFile,
        reviewAudioFile: `audio/ja/${job.section}/${job.id}.mp3`
    }));
    const manifest = {
        version: 1,
        language: LANGUAGE.code,
        locale: LANGUAGE.locale,
        voice: VOICE_NAME,
        gender: 'Female',
        rate: RATE,
        speedPercent: SPEED_PERCENT,
        region: settings.region,
        format: 'audio-24khz-48kbitrate-mono-mp3',
        generatedAt,
        generationStats,
        sourceFiles: sources.map((source) => ({ fileName: source.fileName, sourceSha256: source.sourceSha256 })),
        items
    };
    const risks = items.filter((item) => item.riskReasons.length);
    const riskPayload = {
        version: 1,
        note: '자동 위험 후보 목록이며 실제 발음 오류 판정은 사람의 청취가 필요합니다.',
        totalItems: items.length,
        riskItems: risks.length,
        items: risks
    };

    fs.writeFileSync(path.join(REVIEW_ROOT, 'generation-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(REVIEW_ROOT, 'pronunciation-risk-ja.json'), `${JSON.stringify(riskPayload, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(REVIEW_ROOT, 'index.html'), createReviewHtml(manifest), 'utf8');

    const csvRows = [['id', 'section', 'stage', 'word_ja', 'reading_ja', 'note_ko', 'risk_reasons', 'audio_file']];
    items.forEach((item) => csvRows.push([
        item.id, item.section, item.stage, item.displayText, item.speechText, item.noteKo, item.riskReasons.join(' | '), item.reviewAudioFile
    ]));
    const csv = `\uFEFF${csvRows.map((row) => row.map(csvEscape).join(',')).join('\r\n')}\r\n`;
    fs.writeFileSync(path.join(REVIEW_ROOT, 'pronunciation-review-ja.csv'), csv, 'utf8');

    if (packageAudio) {
        for (const job of jobs) {
            const reviewFile = path.join(REVIEW_ROOT, 'audio', 'ja', job.section, `${job.id}.mp3`);
            fs.mkdirSync(path.dirname(reviewFile), { recursive: true });
            if (!fs.existsSync(reviewFile) || fs.statSync(reviewFile).size !== fs.statSync(job.outputFile).size) {
                fs.copyFileSync(job.outputFile, reviewFile);
            }
        }
    }
    return { manifest, riskCount: risks.length };
}

async function main() {
    const args = parseArguments(process.argv.slice(2));
    const overrides = loadOverrides();
    const { sources, jobs: allJobs } = loadSourceData(overrides);
    addRiskFlags(allJobs);
    const jobs = args.limit ? allJobs.slice(0, args.limit) : allJobs;
    const totalCharacters = jobs.reduce((sum, job) => sum + [...job.speechText].length, 0);

    console.log(`일본어 대상 ${jobs.length}개, ${totalCharacters}자, 여성 음성 ${VOICE_NAME}, 속도 ${SPEED_PERCENT}%`);
    console.log(`자동 우선 청취 후보 ${allJobs.filter((job) => job.riskReasons.length).length}개, 발음 재정의 ${Object.keys(overrides).length}개`);

    if (args.dryRun) {
        console.log('DRY RUN: API 키, 네트워크, 음성 파일, JSON 데이터를 변경하지 않았습니다.');
        return;
    }

    const settings = loadAzureSettings();
    if (settings.region !== 'koreacentral') throw new Error(`Azure 지역은 koreacentral이어야 합니다: ${settings.region}`);
    const catalog = await fetchVoiceCatalog(settings);
    const voice = catalog.find((item) => item.ShortName === VOICE_NAME);
    if (!voice) throw new Error(`${VOICE_NAME} 음성을 Azure ${settings.region}에서 찾지 못했습니다.`);
    if (voice.Locale !== LANGUAGE.locale || String(voice.Gender).toLowerCase() !== 'female') {
        throw new Error(`${VOICE_NAME}의 언어 또는 성별 정보가 예상과 다릅니다.`);
    }

    const generationStats = await generateAll(settings, voice, jobs, args);
    verifyGeneratedFiles(jobs);

    let backupRoot = '';
    if (args.commitData) {
        verifyGeneratedFiles(allJobs);
        backupRoot = commitAudioPaths(sources, allJobs);
        console.log(`일본어 audioFile_ja 2,500개 연결 완료. 백업: ${backupRoot}`);
    }

    if (!args.limit) {
        const review = writeReviewPackage(settings, allJobs, sources, generationStats, args.packageReview);
        console.log(`검수 패키지 준비 완료: ${path.join(REVIEW_ROOT, 'index.html')}`);
        console.log(`자동 우선 청취 후보: ${review.riskCount}개`);
    }

    console.log(`완료: 새로 생성 ${generationStats.generated}, 기존 유지 ${generationStats.retained}, 실패 0`);
}

main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
});
