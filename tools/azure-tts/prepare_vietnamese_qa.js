const fs = require('fs');
const path = require('path');

const {
    DATA_FILES,
    PROJECT_ROOT,
    fetchVoiceCatalog,
    loadAzureSettings,
    synthesizeAuditionAudio
} = require('./azure_tts_common');

const LANGUAGE = { code: 'vi', suffix: 'vi', locale: 'vi-VN' };
const VOICES = ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'];
const PROFILES = [
    { id: 'normal', label: '정상 속도 100%', rate: '0%' },
    { id: 'learning', label: '가벼운 감속 95%', rate: '-5%' },
    { id: 'legacy', label: '기존 생성 속도 88%', rate: '-12%' }
];
const OUTPUT_ROOT = path.join(PROJECT_ROOT, 'tts-review', 'vietnamese-pronunciation-qa');
const SAMPLE_COUNT = 30;

function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function loadRows() {
    return DATA_FILES.flatMap((fileName) => {
        const section = path.basename(fileName, '.json');
        const rows = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'data', fileName), 'utf8'));
        return rows.map((row) => ({
            id: String(row.id), section,
            text: String(row.word_vi || '').trim().normalize('NFC'),
            meaning: String(row.word_ko || '').trim()
        }));
    });
}

function chooseSamples(rows) {
    const marks = ['ă', 'â', 'ê', 'ô', 'ơ', 'ư', 'đ'];
    const scored = rows.map((row) => {
        const lower = row.text.toLocaleLowerCase('vi');
        const markCount = marks.filter((mark) => lower.includes(mark)).length;
        const toneCount = (lower.match(/[àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/g) || []).length;
        const words = row.text.split(/\s+/).length;
        return { ...row, score: markCount * 5 + toneCount * 2 + words * 3 + Math.min(row.text.length, 20) };
    });

    const sections = [...new Set(scored.map((row) => row.section))];
    const selected = [];
    for (const section of sections) {
        selected.push(...scored.filter((row) => row.section === section)
            .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 2));
    }
    const used = new Set(selected.map((row) => row.id));
    selected.push(...scored.filter((row) => !used.has(row.id))
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
        .slice(0, SAMPLE_COUNT - selected.length));
    return selected.sort((a, b) => a.section.localeCompare(b.section) || a.id.localeCompare(b.id));
}

function renderHtml(manifest) {
    const rows = manifest.samples.map((sample) => {
        const players = manifest.voices.flatMap((voice) => PROFILES.map((profile) => {
            const src = `audio/${voice.shortName}/${profile.id}/${sample.id}.mp3`;
            return `<div class="take"><b>${escapeHtml(voice.localName)} · ${escapeHtml(profile.label)}</b><audio controls preload="metadata" src="${escapeHtml(src)}"></audio><label><input type="radio" name="${sample.id}" value="${voice.shortName}::${profile.id}::pass"> 정확</label><label><input type="radio" name="${sample.id}" value="${voice.shortName}::${profile.id}::fail"> 오류</label></div>`;
        })).join('');
        return `<section><h2>${escapeHtml(sample.text)} <small>${escapeHtml(sample.meaning)} · ${escapeHtml(sample.id)}</small></h2><div class="grid">${players}</div><textarea data-note="${sample.id}" placeholder="들리는 문제나 원어민 검수 의견"></textarea></section>`;
    }).join('');
    return `<!doctype html><html lang="ko"><meta charset="utf-8"><title>베트남어 TTS 발음 검수</title><style>body{font-family:system-ui;max-width:1200px;margin:auto;padding:24px;background:#f6f3ee;color:#222}header,section{background:white;border-radius:18px;padding:20px;margin:16px 0;box-shadow:0 3px 16px #0001}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.take{padding:12px;background:#faf8f4;border-radius:12px}.take b,audio{display:block;width:100%;margin-bottom:8px}small{font-weight:400;color:#666}textarea{box-sizing:border-box;width:100%;min-height:60px;margin-top:12px}button{padding:12px 18px;font-weight:700}@media(max-width:800px){.grid{grid-template-columns:1fr}}</style><header><h1>베트남어 TTS 발음 검수</h1><p>30개 위험 표본 · 두 음성 · 세 속도. 기존 88% 결과는 참고용이며 승인 전까지 교체하지 않습니다.</p><button id="save">검수 결과 저장</button></header>${rows}<script>document.getElementById('save').onclick=()=>{const results={savedAt:new Date().toISOString(),ratings:{},notes:{}};document.querySelectorAll('input:checked').forEach(x=>results.ratings[x.name]=x.value);document.querySelectorAll('textarea').forEach(x=>results.notes[x.dataset.note]=x.value);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(results,null,2)],{type:'application/json'}));a.download='vietnamese-qa-results.json';a.click();};</script></html>`;
}

async function main() {
    const settings = loadAzureSettings();
    const catalog = await fetchVoiceCatalog(settings);
    const voices = VOICES.map((name) => {
        const voice = catalog.find((item) => item.ShortName === name);
        if (!voice) throw new Error(`${name} 음성을 찾지 못했습니다.`);
        return voice;
    });
    const samples = chooseSamples(loadRows());
    fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
    for (const voice of voices) {
        for (const profile of PROFILES) {
            const directory = path.join(OUTPUT_ROOT, 'audio', voice.ShortName, profile.id);
            fs.mkdirSync(directory, { recursive: true });
            for (const sample of samples) {
                const output = path.join(directory, `${sample.id}.mp3`);
                if (!fs.existsSync(output)) {
                    const audio = await synthesizeAuditionAudio(settings, voice, LANGUAGE, [{ speechText: sample.text }], { rate: profile.rate });
                    fs.writeFileSync(output, audio);
                }
            }
        }
    }
    const manifest = { generatedAt: new Date().toISOString(), samples, profiles: PROFILES, voices: voices.map((voice) => ({ shortName: voice.ShortName, localName: voice.LocalName, gender: voice.Gender })) };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'index.html'), renderHtml(manifest));
    console.log(`완료: ${samples.length * voices.length * PROFILES.length}개 비교 음성`);
    console.log(path.join(OUTPUT_ROOT, 'index.html'));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
