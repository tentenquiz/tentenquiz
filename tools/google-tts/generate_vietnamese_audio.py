import concurrent.futures
import hashlib
import json
import os
import shutil
import time
from datetime import datetime
from pathlib import Path

from google.api_core.exceptions import GoogleAPICallError, RetryError, ServiceUnavailable, TooManyRequests
from google.cloud import texttospeech

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SECRET_FILE = PROJECT_ROOT.parent / ".secrets" / "english-audio-api-7428072ce77a.json"
DATA_ROOT = PROJECT_ROOT / "data"
LIVE_ROOT = PROJECT_ROOT / "audio" / "vi"
BUILD_ROOT = PROJECT_ROOT / "tts-build" / "google-vi-VN-Neural2-A-88"
STAGING_ROOT = BUILD_ROOT / "audio"
SUMMARY_FILE = BUILD_ROOT / "generation-summary.json"
VOICE_NAME = "vi-VN-Neural2-A"
LANGUAGE_CODE = "vi-VN"
CONCURRENCY = 8
SPEAKING_RATE = 0.88
DATA_FILES = [
    "nature_weather.json", "people_relations.json", "body_health.json", "food_drink.json",
    "home_daily_life.json", "activities_leisure.json", "places_transport.json",
    "school_work.json", "shopping_money.json", "time_calendar.json"
]


def load_jobs():
    jobs = []
    seen = set()
    for file_name in DATA_FILES:
        section = Path(file_name).stem
        rows = json.loads((DATA_ROOT / file_name).read_text(encoding="utf-8"))
        if len(rows) != 250:
            raise RuntimeError(f"{file_name}: 250개가 아닙니다 ({len(rows)})")
        for row in rows:
            item_id = str(row.get("id", "")).strip()
            text = str(row.get("word_vi", "")).strip()
            if not item_id or item_id in seen or not text:
                raise RuntimeError(f"ID 중복/누락 또는 베트남어 원문 누락: {file_name}/{item_id}")
            if row.get("section") != section:
                raise RuntimeError(f"section 불일치: {item_id}")
            seen.add(item_id)
            jobs.append({"id": item_id, "section": section, "text": text, "output": STAGING_ROOT / section / f"{item_id}.mp3"})
    if len(jobs) != 2500:
        raise RuntimeError(f"전체 생성 대상이 2,500개가 아닙니다: {len(jobs)}")
    return jobs


def valid_mp3(path):
    if not path.exists() or path.stat().st_size < 1000:
        return False
    head = path.read_bytes()[:65536]
    if head[:3] == b"ID3" and len(head) >= 10:
        size = ((head[6] & 0x7F) << 21) | ((head[7] & 0x7F) << 14) | ((head[8] & 0x7F) << 7) | (head[9] & 0x7F)
        head = head[10 + size:]
    return any(head[i] == 0xFF and (head[i + 1] & 0xE0) == 0xE0 for i in range(max(0, len(head) - 1)))


def synthesize(client, job):
    output = job["output"]
    if valid_mp3(output):
        return "retained"
    output.parent.mkdir(parents=True, exist_ok=True)
    last_error = None
    for attempt in range(7):
        try:
            response = client.synthesize_speech(
                input=texttospeech.SynthesisInput(text=job["text"]),
                voice=texttospeech.VoiceSelectionParams(language_code=LANGUAGE_CODE, name=VOICE_NAME),
                audio_config=texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.MP3,
                    speaking_rate=SPEAKING_RATE,
                ),
            )
            temporary = output.with_suffix(".mp3.part")
            temporary.write_bytes(response.audio_content)
            if not valid_mp3(temporary):
                raise RuntimeError("생성된 MP3가 비정상입니다")
            os.replace(temporary, output)
            return "generated"
        except (GoogleAPICallError, RetryError, ServiceUnavailable, TooManyRequests, RuntimeError) as error:
            last_error = error
            if attempt < 6:
                time.sleep(min(15, 0.7 * (2 ** attempt)))
    raise RuntimeError(f"{job['id']}/{job['text']}: {last_error}")


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    if not SECRET_FILE.exists():
        raise FileNotFoundError(f"서비스 계정 파일 없음: {SECRET_FILE}")
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(SECRET_FILE)
    jobs = load_jobs()
    client = texttospeech.TextToSpeechClient()
    catalog = client.list_voices(language_code=LANGUAGE_CODE).voices
    voice = next((item for item in catalog if item.name == VOICE_NAME), None)
    if not voice or texttospeech.SsmlVoiceGender(voice.ssml_gender).name != "FEMALE":
        raise RuntimeError(f"Google에서 여성 음성 {VOICE_NAME}을 확인하지 못했습니다")

    stats = {"generated": 0, "retained": 0, "failed": 0}
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        future_map = {pool.submit(synthesize, client, job): job for job in jobs}
        for completed, future in enumerate(concurrent.futures.as_completed(future_map), 1):
            job = future_map[future]
            try:
                stats[future.result()] += 1
            except Exception as error:
                stats["failed"] += 1
                failures.append({"id": job["id"], "error": str(error)})
            if completed % 100 == 0 or completed == len(jobs):
                print(f"[{completed}/{len(jobs)}] 생성 {stats['generated']}, 유지 {stats['retained']}, 실패 {stats['failed']}", flush=True)
    if failures:
        raise RuntimeError(f"생성 실패 {len(failures)}개: {failures[:10]}")

    invalid = [str(job["output"]) for job in jobs if not valid_mp3(job["output"])]
    if invalid:
        raise RuntimeError(f"MP3 검증 실패 {len(invalid)}개: {invalid[:10]}")

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root = PROJECT_ROOT / "backups" / f"audio-vi-azure-HoaiMy-88-{timestamp}"
    if LIVE_ROOT.exists():
        shutil.copytree(LIVE_ROOT, backup_root)
    for job in jobs:
        destination = LIVE_ROOT / job["section"] / f"{job['id']}.mp3"
        destination.parent.mkdir(parents=True, exist_ok=True)
        os.replace(job["output"], destination)

    live_files = list(LIVE_ROOT.rglob("*.mp3"))
    if len(live_files) != 2500 or any(not valid_mp3(path) for path in live_files):
        raise RuntimeError("적용 후 audio/vi 전수 검증 실패")
    BUILD_ROOT.mkdir(parents=True, exist_ok=True)
    summary = {
        "generatedAt": datetime.now().astimezone().isoformat(), "provider": "Google Cloud Text-to-Speech",
        "locale": LANGUAGE_CODE, "voice": VOICE_NAME, "gender": "FEMALE", "speakingRate": SPEAKING_RATE,
        "files": len(live_files), "bytes": sum(path.stat().st_size for path in live_files),
        "stats": stats, "backupRoot": str(backup_root),
        "sourceHashes": {name: sha256(DATA_ROOT / name) for name in DATA_FILES}
    }
    SUMMARY_FILE.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"적용 완료: {len(live_files)}개", flush=True)
    print(f"기존 파일 백업: {backup_root}", flush=True)
    print(f"요약: {SUMMARY_FILE}", flush=True)


if __name__ == "__main__":
    main()
