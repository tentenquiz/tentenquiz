from pathlib import Path
import json
import sys


global_path = Path(sys.argv[1])
legacy_path = Path(sys.argv[2])
target_lang = sys.argv[3] if len(sys.argv) > 3 else "ja"

rows = json.loads(global_path.read_text(encoding="utf-8"))
legacy_rows = []
for row in rows:
    legacy_rows.append(
        {
            "id": f"ja_{row['id']}",
            "targetLang": target_lang,
            "section": row["section"],
            "stage": row["stage"],
            "word_en": row["word_en"],
            "word_ko": row["word_ko"],
            "word_ja": row["word_ja"],
            "word_zh": row["word_zh_cn"],
            "reading_en": row["reading_en"],
            "reading_ko": row["reading_ko"],
            "reading_ja": row["reading_ja"],
            "reading_zh": row["reading_zh_cn"],
            "note_en": row["note_en"],
            "note_ko": row["note_ko"],
            "note_ja": row["note_ja"],
            "note_zh": row["note_zh_cn"],
            "audioFile": "",
        }
    )

legacy_path.parent.mkdir(parents=True, exist_ok=True)
legacy_path.write_text(json.dumps(legacy_rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"exported {len(legacy_rows)} legacy rows to {legacy_path.name}")
