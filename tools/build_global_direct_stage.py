from pathlib import Path
import json
import sys


translation_path = Path(sys.argv[1])
global_path = Path(sys.argv[2])
requested_stage = int(sys.argv[3])
section = sys.argv[4]
id_prefix = sys.argv[5]

lines = [line for line in translation_path.read_text(encoding="utf-8").splitlines() if line.strip()]
header = lines[0].split("|")
items = []
for line_number, line in enumerate(lines[1:], 2):
    values = line.split("|")
    if len(values) != len(header):
        raise SystemExit(
            f"translation line {line_number}: expected {len(header)} columns, got {len(values)}"
        )
    items.append(dict(zip(header, values)))

if len(items) != 25:
    raise SystemExit(f"expected 25 translation rows, got {len(items)}")

start = (requested_stage - 1) * 25 + 1
expected_ids = [f"{id_prefix}_{number:04d}" for number in range(start, start + 25)]
actual_ids = [item["id"] for item in items]
if actual_ids != expected_ids:
    raise SystemExit(f"stage {requested_stage} ids are not the expected consecutive range")

new_rows = []
for item in items:
    row = {
        "id": item["id"],
        "section": section,
        "stage": requested_stage,
        **{f"word_{lang}": item[f"word_{lang}"] for lang in ("en", "ko", "ja", "zh_cn", "zh_tw", "fr", "de", "es", "vi", "ar", "it", "ru")},
        "reading_en": item["reading_en"],
        "reading_ko": item["reading_ko"],
        "reading_ja": item["reading_ja"],
        "reading_zh_cn": item["reading_zh_cn"],
        "reading_zh_tw": item["reading_zh_tw"],
        "zhuyin_zh_tw": item["zhuyin_zh_tw"],
        "reading_fr": item["word_fr"],
        "reading_de": item["word_de"],
        "reading_es": item["word_es"],
        "reading_vi": item["word_vi"],
        "reading_ar": item["reading_ar"],
        "reading_it": item["word_it"],
        "reading_ru": item["reading_ru"],
        **{f"note_{lang}": item[f"note_{lang}"] for lang in ("en", "ko", "ja", "zh_cn", "zh_tw", "fr", "de", "es", "vi", "ar", "it", "ru")},
        **{f"audioFile_{lang}": "" for lang in ("en", "ko", "ja", "zh_cn", "zh_tw", "fr", "de", "es", "vi", "ar", "it", "ru")},
    }
    new_rows.append(row)

global_rows = []
if global_path.exists() and global_path.stat().st_size:
    global_rows = json.loads(global_path.read_text(encoding="utf-8"))
existing_ids = {row["id"] for row in global_rows}
if existing_ids.intersection(row["id"] for row in new_rows):
    raise SystemExit(f"stage {requested_stage} ids already exist in global file")

combined = sorted(global_rows + new_rows, key=lambda row: int(row["id"].rsplit("_", 1)[1]))
global_path.parent.mkdir(parents=True, exist_ok=True)
global_path.write_text(json.dumps(combined, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {len(new_rows)} {section} stage {requested_stage} rows; total {len(combined)}")
