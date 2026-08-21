import json
import os
from pathlib import Path

from google.cloud import texttospeech

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SECRET_FILE = PROJECT_ROOT.parent / ".secrets" / "english-audio-api-7428072ce77a.json"
AZURE_MANIFEST = PROJECT_ROOT / "tts-review" / "vietnamese-pronunciation-qa" / "manifest.json"
OUTPUT_ROOT = PROJECT_ROOT / "tts-review" / "google-vietnamese-pronunciation-qa"
VOICES = [
    "vi-VN-Neural2-A",
    "vi-VN-Wavenet-A",
    "vi-VN-Wavenet-C",
    "vi-VN-Chirp3-HD-Aoede",
    "vi-VN-Chirp3-HD-Kore",
]


def esc(value):
    return (str(value).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#39;"))


def main():
    if not SECRET_FILE.exists():
        raise FileNotFoundError(f"서비스 계정 파일 없음: {SECRET_FILE}")
    if not AZURE_MANIFEST.exists():
        raise FileNotFoundError(f"공통 표본 파일 없음: {AZURE_MANIFEST}")
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(SECRET_FILE)
    samples = json.loads(AZURE_MANIFEST.read_text(encoding="utf-8"))["samples"]
    client = texttospeech.TextToSpeechClient()
    available = {voice.name: voice for voice in client.list_voices(language_code="vi-VN").voices}
    missing = [name for name in VOICES if name not in available]
    if missing:
        raise RuntimeError(f"Google 음성 목록에 없음: {missing}")

    for voice_name in VOICES:
        directory = OUTPUT_ROOT / "audio" / voice_name
        directory.mkdir(parents=True, exist_ok=True)
        for sample in samples:
            output = directory / f"{sample['id']}.mp3"
            if output.exists():
                continue
            response = client.synthesize_speech(
                input=texttospeech.SynthesisInput(text=sample["text"]),
                voice=texttospeech.VoiceSelectionParams(language_code="vi-VN", name=voice_name),
                audio_config=texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3),
            )
            if len(response.audio_content) < 1000:
                raise RuntimeError(f"비정상 파일: {voice_name}/{sample['id']}")
            output.write_bytes(response.audio_content)

    cards = []
    for sample in samples:
        players = "".join(
            f'<div><b>{esc(voice)}</b><audio controls preload="metadata" src="audio/{esc(voice)}/{esc(sample["id"])}.mp3"></audio></div>'
            for voice in VOICES
        )
        cards.append(f'<section><h2>{esc(sample["text"])} <small>{esc(sample["meaning"])} · {esc(sample["id"])}</small></h2><div class="grid">{players}</div></section>')
    html = f'''<!doctype html><html lang="ko"><meta charset="utf-8"><title>Google 베트남어 TTS 비교</title>
<style>body{{font-family:system-ui;max-width:1200px;margin:auto;padding:24px;background:#f4f6f8}}header,section{{background:#fff;padding:20px;margin:16px 0;border-radius:18px}}.grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}.grid div{{padding:12px;background:#f7f8fa;border-radius:12px}}audio,b{{display:block;width:100%;margin:6px 0}}small{{font-weight:400;color:#666}}@media(max-width:800px){{.grid{{grid-template-columns:1fr}}}}</style>
<header><h1>Google 베트남어 TTS 비교</h1><p>Azure와 같은 30개 위험 표본 · 여성 음성 5개 · 정상 속도.</p></header>{''.join(cards)}</html>'''
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    (OUTPUT_ROOT / "index.html").write_text(html, encoding="utf-8")
    (OUTPUT_ROOT / "manifest.json").write_text(json.dumps({"voices": VOICES, "samples": samples}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"완료: {len(VOICES) * len(samples)}개 비교 음성")
    print(OUTPUT_ROOT / "index.html")


if __name__ == "__main__":
    main()
