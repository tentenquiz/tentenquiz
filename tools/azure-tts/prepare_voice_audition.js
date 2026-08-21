const fs = require('fs');
const path = require('path');

const {
    DEFAULT_REVIEW_ROOT,
    LANGUAGES,
    chooseCandidateVoices,
    fetchVoiceCatalog,
    getAuditionSamples,
    loadAzureSettings,
    loadGlobalData,
    synthesizeAuditionAudio
} = require('./azure_tts_common');

function parseArguments(argv) {
    const args = { dryRun: false, catalogOnly: false, force: false, output: DEFAULT_REVIEW_ROOT };
    for (let index = 0; index < argv.length; index++) {
        const value = argv[index];
        if (value === '--dry-run') args.dryRun = true;
        else if (value === '--catalog-only') args.catalogOnly = true;
        else if (value === '--force') args.force = true;
        else if (value === '--output') {
            index++;
            if (!argv[index]) throw new Error('--output 뒤에 폴더 경로가 필요합니다.');
            args.output = path.resolve(argv[index]);
        } else {
            throw new Error(`알 수 없는 옵션입니다: ${value}`);
        }
    }
    return args;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createReviewHtml(manifest) {
    const sections = manifest.languages.map((language) => {
        const sampleWords = language.samples.map((sample) => {
            const reading = sample.readingText !== sample.displayText
                ? `<small>${escapeHtml(sample.readingText)}</small>`
                : '';
            return `<span class="sample-word" dir="auto"><b>${escapeHtml(sample.displayText)}</b>${reading}</span>`;
        }).join('');

        const voiceCards = language.voices.map((voice) => `
            <label class="voice-card">
                <span class="voice-choice">
                    <input type="radio" name="voice-${escapeHtml(language.code)}" value="${escapeHtml(voice.shortName)}" data-language="${escapeHtml(language.code)}">
                    <span>
                        <strong>${escapeHtml(voice.localName || voice.displayName || voice.shortName)}</strong>
                        <small>${escapeHtml(voice.gender)} · ${escapeHtml(voice.shortName)}</small>
                    </span>
                </span>
                <audio controls preload="metadata" src="${escapeHtml(voice.audioFile)}"></audio>
            </label>`).join('');

        return `
        <section class="language-card" id="language-${escapeHtml(language.directory)}">
            <div class="language-title">
                <h2>${escapeHtml(language.label)}</h2>
                <span>${escapeHtml(language.locale)}</span>
            </div>
            <div class="sample-list">${sampleWords}</div>
            <div class="voice-grid">${voiceCards}</div>
        </section>`;
    }).join('');

    const manifestJson = JSON.stringify(manifest).replace(/</g, '\\u003c');
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TentenQuiz Azure 음성 비교</title>
    <style>
        :root { color-scheme: light; --wine:#7b2525; --paper:#fff; --cream:#fff8ed; --line:#e9d8ca; --muted:#70645d; }
        * { box-sizing: border-box; }
        body { margin:0; background:var(--cream); color:#28231f; font-family:"Pretendard","Noto Sans KR","Malgun Gothic",sans-serif; line-height:1.6; }
        main { width:min(1100px,calc(100% - 28px)); margin:28px auto 60px; }
        .hero { padding:28px; border:1px solid var(--line); border-radius:22px; background:var(--paper); box-shadow:0 14px 40px rgba(80,45,25,.08); }
        h1 { margin:0 0 8px; color:var(--wine); font-size:clamp(27px,5vw,42px); }
        .hero p { margin:8px 0; }
        .status { display:flex; flex-wrap:wrap; gap:8px 18px; color:var(--muted); font-size:14px; }
        .language-card { margin-top:20px; padding:24px; border:1px solid var(--line); border-radius:20px; background:var(--paper); }
        .language-title { display:flex; align-items:baseline; justify-content:space-between; gap:12px; }
        .language-title h2 { margin:0; color:var(--wine); }
        .language-title span { color:var(--muted); font-size:14px; }
        .sample-list { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0 18px; }
        .sample-word { display:inline-flex; align-items:baseline; gap:6px; padding:6px 10px; border-radius:999px; background:#f7eee5; }
        .sample-word small { color:var(--muted); }
        .voice-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .voice-card { display:grid; gap:12px; padding:16px; border:2px solid transparent; border-radius:16px; background:#fbf8f4; cursor:pointer; }
        .voice-card:has(input:checked) { border-color:var(--wine); background:#fff7f4; }
        .voice-choice { display:flex; align-items:flex-start; gap:10px; }
        .voice-choice input { margin-top:5px; accent-color:var(--wine); }
        .voice-choice strong,.voice-choice small { display:block; }
        .voice-choice small { color:var(--muted); overflow-wrap:anywhere; }
        audio { width:100%; }
        .actions { position:sticky; bottom:12px; display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:24px; padding:14px; border:1px solid var(--line); border-radius:18px; background:rgba(255,255,255,.94); backdrop-filter:blur(8px); }
        button { min-height:44px; padding:10px 18px; border:0; border-radius:999px; font-weight:800; cursor:pointer; }
        .primary { color:#fff; background:var(--wine); }
        .secondary { color:var(--wine); background:#f1dfd9; }
        #selection-status { width:100%; color:var(--muted); font-size:14px; text-align:center; }
        @media (max-width:700px) { .voice-grid{grid-template-columns:1fr} .hero,.language-card{padding:19px} }
    </style>
</head>
<body>
<main>
    <section class="hero">
        <h1>TentenQuiz 음성 비교</h1>
        <p>각 언어에서 두 목소리를 차례로 듣고 더 자연스럽고 또렷한 목소리를 하나 선택하세요. 다섯 단어 사이에는 짧은 간격이 있습니다.</p>
        <div class="status"><span>지역: ${escapeHtml(manifest.region)}</span><span>형식: 24kHz 48kbps mono MP3</span><span>생성: ${escapeHtml(manifest.generatedAt)}</span></div>
    </section>
    ${sections}
    <div class="actions">
        <div id="selection-status">선택 0 / ${manifest.languages.length}</div>
        <button class="primary" id="download-selection" type="button">선택 결과 저장</button>
        <button class="secondary" id="clear-selection" type="button">선택 초기화</button>
    </div>
</main>
<script type="application/json" id="audition-manifest">${manifestJson}</script>
<script>
(() => {
    const manifest = JSON.parse(document.getElementById('audition-manifest').textContent);
    const storageKey = 'tentenquiz.azureVoiceSelection.v1';
    const inputs = [...document.querySelectorAll('input[type="radio"][data-language]')];
    const status = document.getElementById('selection-status');
    const load = () => { try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; } };
    const save = (selection) => localStorage.setItem(storageKey, JSON.stringify(selection));
    const update = () => {
        const selection = load();
        status.textContent = '선택 ' + Object.keys(selection).length + ' / ' + manifest.languages.length;
    };
    const stored = load();
    inputs.forEach((input) => {
        if (stored[input.dataset.language] === input.value) input.checked = true;
        input.addEventListener('change', () => {
            const selection = load();
            selection[input.dataset.language] = input.value;
            save(selection);
            update();
        });
    });
    document.getElementById('download-selection').addEventListener('click', () => {
        const selection = load();
        if (Object.keys(selection).length !== manifest.languages.length) {
            alert('12개 언어의 목소리를 모두 선택해 주세요.');
            return;
        }
        const payload = JSON.stringify({ region:manifest.region, selectedAt:new Date().toISOString(), voices:selection }, null, 2);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([payload], { type:'application/json' }));
        link.download = 'tentenquiz-azure-voice-selection.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    document.getElementById('clear-selection').addEventListener('click', () => {
        if (!confirm('모든 음성 선택을 초기화할까요?')) return;
        localStorage.removeItem(storageKey);
        inputs.forEach((input) => { input.checked = false; });
        update();
    });
    update();
})();
</script>
</body>
</html>`;
}

async function main() {
    const args = parseArguments(process.argv.slice(2));
    const rows = loadGlobalData();
    const settings = loadAzureSettings({ requireKey: !args.dryRun });

    if (settings.region !== 'koreacentral') {
        throw new Error(`이 프로젝트에서 확정한 지역은 koreacentral입니다. 현재 설정: ${settings.region}`);
    }

    const sampleSummary = LANGUAGES.map((language) => ({
        code: language.code,
        locale: language.locale,
        label: language.label,
        samples: getAuditionSamples(rows, language)
    }));

    if (args.dryRun) {
        console.log('OK: Azure Speech 지역 koreacentral');
        console.log(`OK: ${rows.length}개 데이터와 ${LANGUAGES.length}개 학습 언어`);
        sampleSummary.forEach((item) => {
            console.log(`${item.code} (${item.locale}): ${item.samples.map((sample) => sample.speechText).join(' / ')}`);
        });
        console.log('DRY RUN: API 키와 네트워크를 사용하지 않았습니다.');
        return;
    }

    fs.mkdirSync(args.output, { recursive: true });
    const voices = await fetchVoiceCatalog(settings);
    fs.writeFileSync(path.join(args.output, 'azure-voice-catalog.json'), `${JSON.stringify(voices, null, 2)}\n`, 'utf8');
    console.log(`Azure에서 ${voices.length}개 음성 정보를 확인했습니다.`);

    if (args.catalogOnly) {
        console.log(`음성 목록 저장 완료: ${path.join(args.output, 'azure-voice-catalog.json')}`);
        return;
    }

    const manifest = {
        version: 1,
        region: settings.region,
        generatedAt: new Date().toISOString(),
        languages: []
    };

    const jobs = [];
    for (const language of LANGUAGES) {
        const samples = getAuditionSamples(rows, language);
        const candidates = chooseCandidateVoices(voices, language);
        const languageEntry = {
            code: language.code,
            directory: language.directory,
            suffix: language.suffix,
            label: language.label,
            locale: language.locale,
            samples,
            voices: []
        };

        for (const voice of candidates) {
            const relativeAudioFile = path.posix.join('audio', language.directory, `${voice.ShortName}.mp3`);
            languageEntry.voices.push({
                shortName: voice.ShortName,
                displayName: voice.DisplayName || voice.ShortName,
                localName: voice.LocalName || voice.DisplayName || voice.ShortName,
                gender: voice.Gender || 'Unknown',
                audioFile: relativeAudioFile
            });
            jobs.push({ language, samples, voice, relativeAudioFile });
        }
        manifest.languages.push(languageEntry);
    }

    let completed = 0;
    for (const job of jobs) {
        const outputFile = path.join(args.output, ...job.relativeAudioFile.split('/'));
        fs.mkdirSync(path.dirname(outputFile), { recursive: true });

        if (!args.force && fs.existsSync(outputFile) && fs.statSync(outputFile).size >= 1000) {
            completed++;
            console.log(`[${completed}/${jobs.length}] 기존 파일 유지: ${job.relativeAudioFile}`);
            continue;
        }

        const audio = await synthesizeAuditionAudio(settings, job.voice, job.language, job.samples);
        fs.writeFileSync(outputFile, audio);
        completed++;
        console.log(`[${completed}/${jobs.length}] 생성: ${job.relativeAudioFile} (${audio.length} bytes)`);
    }

    fs.writeFileSync(path.join(args.output, 'audition-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(args.output, 'index.html'), createReviewHtml(manifest), 'utf8');
    console.log(`비교 페이지 준비 완료: ${path.join(args.output, 'index.html')}`);
}

main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
});
