from pathlib import Path
import json
import sys


source_path = Path(sys.argv[1])
translation_path = Path(sys.argv[2])
global_path = Path(sys.argv[3])
requested_stage = int(sys.argv[4])
section = sys.argv[5]
id_prefix = sys.argv[6]
overrides_path = Path(sys.argv[7]) if len(sys.argv) > 7 else None

source_rows = json.loads(source_path.read_text(encoding="utf-8"))
source_by_id = {row["id"]: row for row in source_rows}
stage_rows = [row for row in source_rows if row["stage"] == requested_stage]

lines = [line for line in translation_path.read_text(encoding="utf-8").splitlines() if line.strip()]
header = lines[0].split("|")
translations = {}
for line_number, line in enumerate(lines[1:], 2):
    values = line.split("|")
    if len(values) != len(header):
        raise SystemExit(f"translation line {line_number}: expected {len(header)} columns, got {len(values)}")
    item = dict(zip(header, values))
    if item["id"] in translations:
        raise SystemExit(f"duplicate translation id {item['id']}")
    translations[item["id"]] = item
if len(translations) != 25:
    raise SystemExit(f"expected 25 translation rows, got {len(translations)}")

uses_source_map = "source_id" in header
if uses_source_map:
    selected_rows = []
    for item_id, extra in sorted(
        translations.items(), key=lambda pair: int(pair[0].rsplit("_", 1)[1])
    ):
        source_id = extra.get("source_id", "")
        source = source_by_id.get(source_id)
        if not source:
            raise SystemExit(f"unknown source_id {source_id!r} for {item_id}")
        selected_rows.append((item_id, source, extra))
else:
    if len(stage_rows) != 25:
        raise SystemExit(f"expected 25 source rows for stage {requested_stage}, got {len(stage_rows)}")
    selected_rows = []
    for source in stage_rows:
        number = int(source["id"].rsplit("_", 1)[1])
        item_id = f"{id_prefix}_{number:04d}"
        extra = translations.get(item_id)
        if not extra:
            raise SystemExit(f"missing translations for {item_id}")
        selected_rows.append((item_id, source, extra))

overrides = {}
if overrides_path:
    overrides = json.loads(overrides_path.read_text(encoding="utf-8"))

new_rows = []
for item_id, source, extra in selected_rows:
    base = {
        "word_en": source["word_en"],
        "word_ko": source["word_ko"],
        "word_ja": source["word_ja"],
        "word_zh_cn": source["word_zh"],
        "reading_en": source["reading_en"],
        "reading_ko": source["reading_ko"],
        "reading_ja": source["reading_ja"],
        "reading_zh_cn": source["reading_zh"],
        "note_en": source["note_en"],
        "note_ko": source["note_ko"],
        "note_ja": source["note_ja"],
        "note_zh_cn": source["note_zh"],
    }
    base.update(overrides.get(item_id, {}))

    row = {
        "id": item_id,
        "section": section,
        "stage": requested_stage,
        "word_en": base["word_en"],
        "word_ko": base["word_ko"],
        "word_ja": base["word_ja"],
        "word_zh_cn": base["word_zh_cn"],
        "word_zh_tw": extra["word_zh_tw"],
        "word_fr": extra["word_fr"],
        "word_de": extra["word_de"],
        "word_es": extra["word_es"],
        "word_vi": extra["word_vi"],
        "word_ar": extra["word_ar"],
        "word_it": extra["word_it"],
        "word_ru": extra["word_ru"],
        "reading_en": base["reading_en"],
        "reading_ko": base["reading_ko"],
        "reading_ja": base["reading_ja"],
        "reading_zh_cn": base["reading_zh_cn"],
        "reading_zh_tw": extra["reading_zh_tw"],
        "zhuyin_zh_tw": extra["zhuyin_zh_tw"],
        "reading_fr": extra["word_fr"],
        "reading_de": extra["word_de"],
        "reading_es": extra["word_es"],
        "reading_vi": extra["word_vi"],
        "reading_ar": extra["reading_ar"],
        "reading_it": extra["word_it"],
        "reading_ru": extra["reading_ru"],
        "note_en": base["note_en"],
        "note_ko": base["note_ko"],
        "note_ja": base["note_ja"],
        "note_zh_cn": base["note_zh_cn"],
        "note_zh_tw": extra["note_zh_tw"],
        "note_fr": extra["note_fr"],
        "note_de": extra["note_de"],
        "note_es": extra["note_es"],
        "note_vi": extra["note_vi"],
        "note_ar": extra["note_ar"],
        "note_it": extra["note_it"],
        "note_ru": extra["note_ru"],
        **{f"audioFile_{lang}": "" for lang in ("en", "ko", "ja", "zh_cn", "zh_tw", "fr", "de", "es", "vi", "ar", "it", "ru")},
    }
    new_rows.append(row)

global_rows = []
if global_path.exists():
    global_rows = json.loads(global_path.read_text(encoding="utf-8"))
existing_ids = {row["id"] for row in global_rows}
if existing_ids.intersection(row["id"] for row in new_rows):
    raise SystemExit(f"stage {requested_stage} ids already exist in global file")

combined = sorted(global_rows + new_rows, key=lambda row: int(row["id"].rsplit("_", 1)[1]))
global_path.parent.mkdir(parents=True, exist_ok=True)
global_path.write_text(json.dumps(combined, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {len(new_rows)} {section} stage {requested_stage} rows; total {len(combined)}")
