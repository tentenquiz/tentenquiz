#!/usr/bin/env python3
"""Find repeated answer-note openings and endings that may sound templated."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path


SECTION_FILES = (
    "nature_weather.json", "people_relations.json", "body_health.json",
    "food_drink.json", "home_daily_life.json", "activities_leisure.json",
    "places_transport.json", "school_work.json", "shopping_money.json",
    "time_calendar.json",
)
LANGS = ("en", "ko", "ja", "zh_cn", "zh_tw", "fr", "de", "es", "vi", "ar", "it", "ru")
CJK_LANGS = {"ja", "zh_cn", "zh_tw"}


def clean(value: str) -> str:
    value = value.casefold().strip()
    value = re.sub(r"[.!?。！？,，、;；:：]", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def fragment(value: str, lang: str, *, ending: bool) -> str:
    value = clean(value)
    if lang in CJK_LANGS:
        compact = value.replace(" ", "")
        width = 7
        return compact[-width:] if ending else compact[:width]
    words = value.split()
    width = 4 if lang != "ko" else 3
    selected = words[-width:] if ending else words[:width]
    return " ".join(selected)


def repeated_fragments(records, lang: str, *, ending: bool, threshold: int):
    groups: dict[str, list[dict[str, object]]] = defaultdict(list)
    for record in records:
        note = str(record[f"note_{lang}"])
        key = fragment(note, lang, ending=ending)
        if key:
            groups[key].append(record)
    rows = []
    for key, group in groups.items():
        if len(group) < threshold:
            continue
        rows.append(
            {
                "fragment": key,
                "count": len(group),
                "sample_ids": [str(item["id"]) for item in group[:12]],
                "sample_notes": [str(item[f"note_{lang}"]) for item in group[:3]],
            }
        )
    return sorted(rows, key=lambda item: (-int(item["count"]), str(item["fragment"])))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir", type=Path)
    parser.add_argument("output_json", type=Path)
    parser.add_argument(
        "--threshold",
        type=int,
        default=10,
        help="minimum number of matching fragments to report (default: 10)",
    )
    args = parser.parse_args()

    records = []
    for filename in SECTION_FILES:
        records.extend(json.loads((args.data_dir / filename).read_text(encoding="utf-8")))

    report = {"records_checked": len(records), "languages": {}}
    for lang in LANGS:
        openings = repeated_fragments(
            records, lang, ending=False, threshold=args.threshold
        )
        endings = repeated_fragments(
            records, lang, ending=True, threshold=args.threshold
        )
        report["languages"][lang] = {
            "repeated_openings": openings,
            "repeated_endings": endings,
        }
        max_opening = openings[0]["count"] if openings else 0
        max_ending = endings[0]["count"] if endings else 0
        print(
            f"{lang}: repeated openings={len(openings)} max={max_opening}; "
            f"endings={len(endings)} max={max_ending}"
        )

    args.output_json.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
