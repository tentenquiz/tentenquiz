#!/usr/bin/env python3
"""Audit short answer-note uniqueness and length across global curriculum data."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path


SECTION_FILES = (
    "nature_weather.json",
    "people_relations.json",
    "body_health.json",
    "food_drink.json",
    "home_daily_life.json",
    "activities_leisure.json",
    "places_transport.json",
    "school_work.json",
    "shopping_money.json",
    "time_calendar.json",
)
LANGS = ("en", "ko", "ja", "zh_cn", "zh_tw", "fr", "de", "es", "vi", "ar", "it", "ru")


def normalized(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir", type=Path)
    parser.add_argument("output_json", type=Path)
    args = parser.parse_args()

    records = []
    for filename in SECTION_FILES:
        records.extend(json.loads((args.data_dir / filename).read_text(encoding="utf-8")))

    duplicate_groups: list[dict[str, object]] = []
    length_stats: dict[str, dict[str, float | int]] = {}
    for lang in LANGS:
        groups: dict[str, list[dict[str, object]]] = defaultdict(list)
        lengths: list[int] = []
        for record in records:
            note = str(record[f"note_{lang}"])
            lengths.append(len(note))
            groups[normalized(note)].append(record)

        for note_key, group in groups.items():
            concepts = {normalized(str(item["word_en"])) for item in group}
            if len(group) > 1 and len(concepts) > 1:
                duplicate_groups.append(
                    {
                        "language": lang,
                        "note": str(group[0][f"note_{lang}"]),
                        "records": [
                            {
                                "id": item["id"],
                                "section": item["section"],
                                "stage": item["stage"],
                                "word_en": item["word_en"],
                                "word": item[f"word_{lang}"],
                            }
                            for item in group
                        ],
                    }
                )

        ordered = sorted(lengths)
        length_stats[lang] = {
            "min": ordered[0],
            "median": ordered[len(ordered) // 2],
            "p95": ordered[int((len(ordered) - 1) * 0.95)],
            "max": ordered[-1],
            "average": round(sum(ordered) / len(ordered), 2),
        }

    report = {
        "records_checked": len(records),
        "notes_checked": len(records) * len(LANGS),
        "different_concept_exact_duplicate_groups": len(duplicate_groups),
        "duplicate_groups": duplicate_groups,
        "length_stats": length_stats,
    }
    args.output_json.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Checked {report['notes_checked']} notes: "
        f"{len(duplicate_groups)} exact duplicate groups across different English concepts."
    )
    for group in duplicate_groups:
        ids = ", ".join(str(item["id"]) for item in group["records"])
        print(f"{group['language']} {ids}: {group['note']}")
    return 1 if duplicate_groups else 0


if __name__ == "__main__":
    raise SystemExit(main())
