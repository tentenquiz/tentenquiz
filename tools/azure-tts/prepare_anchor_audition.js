const fs = require('fs');
const path = require('path');

const {
    LANGUAGES,
    chooseCandidateVoices,
    fetchVoiceCatalog,
    getAuditionSamples,
    loadAzureSettings,
    loadGlobalData,
    synthesizeAuditionAudio
} = require('./azure_tts_common');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUTPUT = path.resolve(PROJECT_ROOT, '..', 'tts-review', 'azure-anchor-audition');
const PROFILES = [
    { id: 'recommended', label: '권장 속도 92%', rate: '-8%', speedPercent: 92 },
    { id: 'slower', label: '느린 비교 88%', rate: '-12%', speedPercent: 88 }
];

function parseArguments(argv) {
    const args = { dryRun: false, catalogOnly: false, force: false, output: DEFAULT_OUTPUT };
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

function hasNewscastStyle(voice) {
    return Array.isArray(voice.StyleList) && voice.StyleList.includes('newscast');
}

function createReviewHtml(manifest) {
    const exactCount = manifest.languages.reduce(
        (count, language) => count + language.voices.filter((voice) => voice.supportsNewscast).length,
        0
    );

    const sections = manifest.languages.map((language) => {
        const sampleWords = language.samples.map((sample) => {
            const reading = sample.readingText !== sample.displayText
                ? `<small>${escapeHtml(sample.readingText)}</small>`
                : '';
            return `<span class="sample-word" dir="auto"><b>${escapeHtml(sample.displayText)}</b>${reading}</span>`;
        }).join('');

        const voiceCards = language.voices.map((voice) => {
            const modeClass = voice.supportsNewscast ? 'exact' : 'neutral';
            const modeLabel = voice.supportsNewscast ? 'Azure 공식 newscast' : '명료한 중립형';
            const modeDescription = voice.supportsNewscast
                ? 'Azure가 이 음성에 제공하는 뉴스 낭독 스타일'
                : '이 언어 음성은 newscast를 지원하지 않아 중립 음성의 속도만 조절';
            const tracks = voice.tracks.map((track) => `
                <div class="track">
                    <label class="track-choice">
                        <input type="radio"
                               name="selection-${escapeHtml(language.code)}"
                               value="${escapeHtml(`${voice.shortName}::${track.profile}`)}"
                               data-language="${escapeHtml(language.code)}"
                               data-voice="${escapeHtml(voice.shortName)}"
                               data-profile="${escapeHtml(track.profile)}"
                               data-rate="${escapeHtml(track.rate)}"
                               data-mode="${escapeHtml(voice.supportsNewscast ? 'newscast' : 'neutral-clear')}">
                        <span><strong>${escapeHtml(track.label)}</strong><small>기본 속도의 ${track.speedPercent}%</small></span>
                    </label>
                    <audio controls preload="metadata" src="${escapeHtml(track.audioFile)}"></audio>
                </div>`).join('');

            return `
            <article class="voice-card">
                <div class="voice-header">
                    <div><h3>${escapeHtml(voice.localName || voice.displayName || voice.shortName)}</h3><small>${escapeHtml(voice.gender)} · ${escapeHtml(voice.shortName)}</small></div>
                    <span class="badge ${modeClass}">${modeLabel}</span>
                </div>
                <p class="mode-description">${modeDescription}</p>
                <div class="track-list">${tracks}</div>
            </article>`;
        }).join('');

        const languageHasExact = language.voices.some((voice) => voice.supportsNewscast);
        return `
        <section class="language-card" id="language-${escapeHtml(language.directory)}">
            <div class="language-title">
                <div><h2>${escapeHtml(language.label)}</h2><span>${escapeHtml(language.locale)}</span></div>
                <span class="language-mode ${languageHasExact ? 'exact' : 'neutral'}">${languageHasExact ? '공식 뉴스 스타일 지원' : '중립 명료형 비교'}</span>
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
    <title>TentenQuiz 앵커 톤·학습 속도 비교</title>
    <style>
        :root { color-scheme:light; --ink:#28231f; --wine:#752525; --paper:#fff; --cream:#fff8ed; --line:#e9d8ca; --muted:#70645d; --blue:#1e5b83; --blue-bg:#e8f3fb; --green:#21633c; --green-bg:#eaf7ef; }
        * { box-sizing:border-box; }
        body { margin:0; background:var(--cream); color:var(--ink); font-family:"Pretendard","Noto Sans KR","Malgun Gothic",sans-serif; line-height:1.55; }
        main { width:min(1180px,calc(100% - 28px)); margin:28px auto 64px; }
        .hero { padding:30px; border:1px solid var(--line); border-radius:24px; background:var(--paper); box-shadow:0 14px 40px rgba(80,45,25,.08); }
        h1 { margin:0 0 10px; color:var(--wine); font-size:clamp(27px,5vw,42px); line-height:1.2; }
        .hero p { margin:8px 0; }
        .notice { margin-top:18px; padding:15px 17px; border-radius:15px; background:#f7f1eb; }
        .notice strong { color:var(--wine); }
        .status { display:flex; flex-wrap:wrap; gap:8px 18px; margin-top:15px; color:var(--muted); font-size:14px; }
        .language-card { margin-top:20px; padding:24px; border:1px solid var(--line); border-radius:20px; background:var(--paper); }
        .language-title { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .language-title h2 { margin:0; color:var(--wine); }
        .language-title div > span { color:var(--muted); font-size:14px; }
        .language-mode,.badge { display:inline-flex; align-items:center; min-height:28px; padding:4px 9px; border-radius:999px; font-size:12px; font-weight:800; white-space:nowrap; }
        .exact { color:var(--green); background:var(--green-bg); }
        .neutral { color:var(--blue); background:var(--blue-bg); }
        .sample-list { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0 18px; }
        .sample-word { display:inline-flex; align-items:baseline; gap:6px; padding:6px 10px; border-radius:999px; background:#f7eee5; }
        .sample-word small { color:var(--muted); }
        .voice-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
        .voice-card { padding:17px; border:1px solid var(--line); border-radius:17px; background:#fcfaf7; }
        .voice-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
        .voice-header h3 { margin:0; font-size:18px; }
        .voice-header small { display:block; margin-top:3px; color:var(--muted); overflow-wrap:anywhere; }
        .mode-description { min-height:44px; margin:11px 0; color:var(--muted); font-size:13px; }
        .track-list { display:grid; gap:10px; }
        .track { display:grid; gap:8px; padding:12px; border:2px solid transparent; border-radius:14px; background:#f5f0eb; }
        .track:has(input:checked) { border-color:var(--wine); background:#fff5f2; }
        .track-choice { display:flex; align-items:flex-start; gap:9px; cursor:pointer; }
        .track-choice input { margin-top:5px; accent-color:var(--wine); }
        .track-choice strong,.track-choice small { display:block; }
        .track-choice small { color:var(--muted); }
        audio { width:100%; height:42px; }
        .actions { position:sticky; bottom:12px; z-index:3; display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:24px; padding:14px; border:1px solid var(--line); border-radius:18px; background:rgba(255,255,255,.95); backdrop-filter:blur(8px); }
        button { min-height:44px; padding:10px 18px; border:0; border-radius:999px; font-weight:800; cursor:pointer; }
        .primary { color:#fff; background:var(--wine); }
        .secondary { color:var(--wine); background:#f1dfd9; }
        #selection-status { width:100%; color:var(--muted); font-size:14px; text-align:center; }
        @media (max-width:760px) { .voice-grid{grid-template-columns:1fr} .hero,.language-card{padding:19px} .language-title,.voice-header{align-items:flex-start} }
        @media (max-width:470px) { .language-title{display:grid} .voice-header{display:grid} .mode-description{min-height:0} }
    </style>
</head>
<body>
<main>
    <section class="hero">
        <h1>앵커 톤·학습 속도 비교</h1>
        <p>같은 다섯 단어를 두 목소리와 두 속도로 듣고, 가장 또렷하면서도 부자연스럽게 느려지지 않는 조합을 고르세요.</p>
        <div class="notice"><strong>표시를 구분했습니다.</strong> 현재 후보 ${manifest.voiceCount}개 중 ${exactCount}개만 Azure의 공식 <code>newscast</code>를 지원합니다. 지원하지 않는 음성은 뉴스 스타일이라고 속이지 않고, 중립 음성의 속도만 학습용으로 조절했습니다.</div>
        <div class="status"><span>권장 시작값: 92%(-8%)</span><span>느린 비교값: 88%(-12%)</span><span>지역: ${escapeHtml(manifest.region)}</span><span>형식: 24kHz 48kbps mono MP3</span></div>
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
    const storageKey = 'tentenquiz.azureAnchorSelection.v1';
    const inputs = [...document.querySelectorAll('input[type="radio"][data-language]')];
    const audios = [...document.querySelectorAll('audio')];
    const status = document.getElementById('selection-status');
    const load = () => { try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; } };
    const save = (selection) => localStorage.setItem(storageKey, JSON.stringify(selection));
    const update = () => {
        const selection = load();
        status.textContent = '선택 ' + Object.keys(selection).length + ' / ' + manifest.languages.length;
    };
    const stored = load();
    inputs.forEach((input) => {
        const selected = stored[input.dataset.language];
        if (selected && selected.voice === input.dataset.voice && selected.profile === input.dataset.profile) input.checked = true;
        input.addEventListener('change', () => {
            const selection = load();
            selection[input.dataset.language] = {
                voice: input.dataset.voice,
                profile: input.dataset.profile,
                rate: input.dataset.rate,
                mode: input.dataset.mode
            };
            save(selection);
            update();
        });
    });
    audios.forEach((audio) => audio.addEventListener('play', () => audios.forEach((other) => { if (other !== audio) other.pause(); })));
    document.getElementById('download-selection').addEventListener('click', () => {
        const selection = load();
        if (Object.keys(selection).length !== manifest.languages.length) {
            alert('12개 언어의 목소리와 속도를 모두 선택해 주세요.');
            return;
        }
        const payload = JSON.stringify({ region:manifest.region, selectedAt:new Date().toISOString(), selections:selection }, null, 2);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([payload], { type:'application/json' }));
        link.download = 'tentenquiz-azure-anchor-speed-selection.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    document.getElementById('clear-selection').addEventListener('click', () => {
        if (!confirm('모든 선택을 초기화할까요?')) return;
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

    if (args.dryRun) {
        console.log(`OK: ${rows.length}개 데이터와 ${LANGUAGES.length}개 학습 언어`);
        console.log(`OK: 비교 속도 ${PROFILES.map((profile) => `${profile.speedPercent}%`).join(', ')}`);
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
        purpose: 'anchor-tone-and-learning-speed-audition',
        region: settings.region,
        generatedAt: new Date().toISOString(),
        format: 'audio-24khz-48kbitrate-mono-mp3',
        profiles: PROFILES,
        voiceCount: 0,
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
            const supportsNewscast = hasNewscastStyle(voice);
            const voiceEntry = {
                shortName: voice.ShortName,
                displayName: voice.DisplayName || voice.ShortName,
                localName: voice.LocalName || voice.DisplayName || voice.ShortName,
                gender: voice.Gender || 'Unknown',
                supportsNewscast,
                synthesisMode: supportsNewscast ? 'newscast' : 'neutral-clear',
                tracks: []
            };
            manifest.voiceCount++;

            for (const profile of PROFILES) {
                const relativeAudioFile = path.posix.join('audio', language.directory, `${voice.ShortName}--${profile.id}.mp3`);
                voiceEntry.tracks.push({ ...profile, audioFile: relativeAudioFile });
                jobs.push({
                    language,
                    samples,
                    voice,
                    profile,
                    relativeAudioFile,
                    synthesisOptions: {
                        rate: profile.rate,
                        style: supportsNewscast ? 'newscast' : '',
                        styleDegree: 1
                    }
                });
            }
            languageEntry.voices.push(voiceEntry);
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

        const audio = await synthesizeAuditionAudio(
            settings,
            job.voice,
            job.language,
            job.samples,
            job.synthesisOptions
        );
        fs.writeFileSync(outputFile, audio);
        completed++;
        console.log(`[${completed}/${jobs.length}] 생성: ${job.relativeAudioFile} (${audio.length} bytes)`);
    }

    fs.writeFileSync(path.join(args.output, 'audition-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(args.output, 'index.html'), createReviewHtml(manifest), 'utf8');
    console.log(`앵커 톤·속도 비교 페이지 준비 완료: ${path.join(args.output, 'index.html')}`);
}

main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
});
