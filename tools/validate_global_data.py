from pathlib import Path
import argparse
import json
import re

LANGS = ("en", "ko", "ja", "zh_cn", "zh_tw", "fr", "de", "es", "vi", "ar", "it", "ru")
AUDIO_FIELDS = tuple(f"audioFile_{lang}" for lang in LANGS)
EXPECTED_FIELDS = (
    "id", "section", "stage",
    *(f"word_{lang}" for lang in LANGS),
    "reading_en", "reading_ko", "reading_ja", "reading_zh_cn", "reading_zh_tw",
    "zhuyin_zh_tw",
    "reading_fr", "reading_de", "reading_es", "reading_vi", "reading_ar", "reading_it", "reading_ru",
    *(f"note_{lang}" for lang in LANGS),
    *AUDIO_FIELDS,
)

parser = argparse.ArgumentParser(description="Validate one TentenQuiz global data file")
parser.add_argument("path", type=Path)
parser.add_argument(
    "--require-audio",
    action="append",
    choices=LANGS,
    default=[],
    help="Require the canonical audio path for this language; repeat for multiple languages",
)
args = parser.parse_args()

path = args.path
required_audio = set(args.require_audio)
expected_section = path.stem
rows = json.loads(path.read_text(encoding="utf-8"))
if not isinstance(rows, list) or not rows:
    raise SystemExit("JSON root must be a non-empty array")

seen_ids = set()
for index, row in enumerate(rows, 1):
    if tuple(row) != EXPECTED_FIELDS:
        missing = [field for field in EXPECTED_FIELDS if field not in row]
        extra = [field for field in row if field not in EXPECTED_FIELDS]
        raise SystemExit(f"row {index}: invalid schema; missing={missing}, extra={extra}")
    if row["id"] in seen_ids:
        raise SystemExit(f"row {index}: duplicate id {row['id']}")
    seen_ids.add(row["id"])
    if row["section"] != expected_section:
        raise SystemExit(
            f"row {index}: invalid section {row['section']!r}; expected {expected_section!r}"
        )
    if not isinstance(row["stage"], int) or not 1 <= row["stage"] <= 10:
        raise SystemExit(f"row {index}: invalid stage")
    for field, value in row.items():
        if field in AUDIO_FIELDS:
            lang = field.removeprefix("audioFile_")
            expected_audio = f"audio/{lang}/{expected_section}/{row['id']}.mp3"
            if value not in ("", expected_audio):
                raise SystemExit(
                    f"row {index}: {field} must be empty or {expected_audio!r}"
                )
            if lang in required_audio and value != expected_audio:
                raise SystemExit(f"row {index}: {field} must be {expected_audio!r}")
        elif field != "stage" and (not isinstance(value, str) or not value.strip()):
            raise SystemExit(f"row {index}: empty {field}")
    japanese_quiz_text = row["word_ja"] + row["reading_ja"]
    if re.search(r"[ァ-ヶー]", japanese_quiz_text):
        raise SystemExit(f"row {index}: katakana found in Japanese word/reading")
    if re.search(r"[^ぁ-ゖゝゞ]", row["reading_ja"]):
        raise SystemExit(f"row {index}: Japanese reading is not hiragana only")
    if not re.search(r"[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]", row["reading_zh_cn"]):
        raise SystemExit(f"row {index}: Chinese pinyin has no tone mark")
    if not re.search(r"[ㄅ-ㄩ]", row["zhuyin_zh_tw"]):
        raise SystemExit(f"row {index}: Traditional Chinese zhuyin is missing")
    if not re.fullmatch(r"[\u0600-\u06ff\s]+", row["word_ar"]):
        raise SystemExit(f"row {index}: Arabic headword contains unexpected script")
    if not re.fullmatch(r"[\u0400-\u04ff\s-]+", row["word_ru"]):
        raise SystemExit(f"row {index}: Russian headword contains unexpected script")
    for lang in LANGS:
        note = row[f"note_{lang}"]
        if not re.search(r"[.!?。！？]$", note):
            raise SystemExit(f"row {index}: note_{lang} is not one finished sentence")

for lang in LANGS:
    for prefix in ("word", "reading"):
        field = f"{prefix}_{lang}"
        values = [row[field].casefold() for row in rows]
        if len(values) != len(set(values)):
            raise SystemExit(f"duplicate values in {field}")

print(f"OK: {path.name}: {len(rows)} global records, {len(EXPECTED_FIELDS)} fields each")
required_message = ", ".join(sorted(required_audio)) if required_audio else "none"
print(
    "OK: 12 languages, unique headwords/readings, no katakana in Japanese word/reading, "
    f"canonical audio paths (required: {required_message})"
)
