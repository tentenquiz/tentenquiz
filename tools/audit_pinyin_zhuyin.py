#!/usr/bin/env python3
"""Audit Traditional-Chinese pinyin against the supplied Zhuyin.

This deliberately converts the record's ``reading_zh_tw`` value instead of
looking up ``word_zh_tw``.  Character dictionaries can choose the wrong
reading for polyphonic characters, while pinyin-to-Zhuyin conversion is
deterministic once the pinyin has been split into syllables.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from functools import lru_cache
from pathlib import Path

from pypinyin.constants import PINYIN_DICT
from pypinyin.style.bopomofo import converter


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

SEPARATOR_RE = re.compile(r"[\s'’\-·・/]+")
TONE_RE = re.compile(r"[1-5]")
ZHUYIN_TONES = "ˊˇˋ˙"


COMBINING_TONES = {
    "\N{COMBINING MACRON}": "1",
    "\N{COMBINING ACUTE ACCENT}": "2",
    "\N{COMBINING CARON}": "3",
    "\N{COMBINING GRAVE ACCENT}": "4",
}


def plain_pinyin(value: str) -> tuple[str, dict[int, str]]:
    """Return ASCII pinyin and tone numbers keyed by their vowel position."""
    value = value.strip().lower().replace("u:", "ü")
    decomposed = unicodedata.normalize("NFD", value)
    clusters: list[tuple[str, list[str]]] = []
    for char in decomposed:
        if unicodedata.combining(char) and clusters:
            clusters[-1][1].append(char)
        else:
            clusters.append((char, []))

    letters: list[str] = []
    tones: dict[int, str] = {}
    for base, marks in clusters:
        if not base.isalpha():
            continue
        letter = base
        if base == "u" and "\N{COMBINING DIAERESIS}" in marks:
            letter = "v"
        elif base == "ê":
            letter = "e"
        letters.append(letter)
        for mark in marks:
            tone = COMBINING_TONES.get(mark)
            if tone:
                tones[len(letters) - 1] = tone
                break
    return "".join(letters), tones


def build_syllable_inventory() -> frozenset[str]:
    syllables: set[str] = {
        # Interjections and uncommon-but-valid written syllables are not
        # consistently represented in the character dictionary.
        "m",
        "n",
        "ng",
        "hm",
        "hng",
        "yo",
        "lo",
        # Taiwan Mandarin uses yái (for example, 懸崖), which mainland-focused
        # pinyin dictionaries often omit from their legal-syllable inventory.
        "yai",
    }
    for readings in PINYIN_DICT.values():
        for reading in readings.split(","):
            plain, _ = plain_pinyin(reading)
            if plain and plain.isascii() and plain.isalpha():
                syllables.add(plain)
    return frozenset(syllables)


SYLLABLES = build_syllable_inventory()


def split_groups(value: str) -> list[tuple[str, dict[int, str]]]:
    return [plain_pinyin(group) for group in SEPARATOR_RE.split(value) if group]


def segment_group(group: str, tone_positions: dict[int, str]) -> list[list[str]]:
    """Return all legal syllable segmentations for a separator-free group."""

    @lru_cache(maxsize=None)
    def walk(position: int) -> tuple[tuple[str, ...], ...]:
        if position == len(group):
            return ((),)

        results: list[tuple[str, ...]] = []
        # Mandarin syllables are at most six ASCII letters before the tone.
        for letter_end in range(position + 1, min(len(group), position + 6) + 1):
            letters = group[position:letter_end]
            if not letters.isalpha() or letters not in SYLLABLES:
                continue
            tones = {
                tone
                for tone_position, tone in tone_positions.items()
                if position <= tone_position < letter_end
            }
            if len(tones) > 1:
                continue
            tone = next(iter(tones), "5")
            syllable = letters + tone
            for tail in walk(letter_end):
                results.append((syllable,) + tail)
        return tuple(results)

    return [list(parts) for parts in walk(0)]


def pinyin_segmentations(value: str, expected_count: int) -> list[list[str]]:
    groups = split_groups(value)
    if not groups:
        return []

    possibilities: list[list[str]] = [[]]
    for group, tone_positions in groups:
        group_options = segment_group(group, tone_positions)
        if not group_options:
            return []
        possibilities = [prefix + option for prefix in possibilities for option in group_options]

    exact = [parts for parts in possibilities if len(parts) == expected_count]
    return exact or possibilities


def canonical_zhuyin_syllable(value: str) -> str:
    value = value.strip()
    tone = ""
    bases: list[str] = []
    for char in value:
        if char in ZHUYIN_TONES:
            tone = char
        else:
            bases.append(char)
    return "".join(bases) + tone


def canonical_zhuyin(value: str) -> list[str]:
    return [canonical_zhuyin_syllable(part) for part in value.split() if part]


def syllable_to_zhuyin(syllable: str) -> str:
    # The converter accepts numbered pinyin.  Pinyin without a tone number is
    # a neutral tone; pypinyin represents that as no trailing digit.
    if syllable.endswith("5"):
        syllable = syllable[:-1]
    return canonical_zhuyin_syllable(converter.to_bopomofo(syllable.replace("v", "ü")))


def audit(data_dir: Path) -> tuple[list[dict[str, object]], list[dict[str, object]], int]:
    mismatches: list[dict[str, object]] = []
    unsegmentable: list[dict[str, object]] = []
    checked = 0

    for filename in SECTION_FILES:
        path = data_dir / filename
        records = json.loads(path.read_text(encoding="utf-8"))
        for record in records:
            checked += 1
            pinyin = record["reading_zh_tw"]
            supplied = canonical_zhuyin(record["zhuyin_zh_tw"])
            candidates = pinyin_segmentations(pinyin, len(supplied))
            if not candidates:
                unsegmentable.append(
                    {
                        "id": record["id"],
                        "word": record["word_zh_tw"],
                        "pinyin": pinyin,
                        "zhuyin": " ".join(supplied),
                    }
                )
                continue

            converted_candidates = [
                [syllable_to_zhuyin(part) for part in parts] for parts in candidates
            ]
            if supplied not in converted_candidates:
                mismatches.append(
                    {
                        "id": record["id"],
                        "word": record["word_zh_tw"],
                        "pinyin": pinyin,
                        "pinyin_parts": candidates[0],
                        "expected": " ".join(converted_candidates[0]),
                        "actual": " ".join(supplied),
                    }
                )

    return mismatches, unsegmentable, checked


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "data_dir",
        nargs="?",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data",
    )
    parser.add_argument("--json-output", type=Path)
    args = parser.parse_args()

    mismatches, unsegmentable, checked = audit(args.data_dir)
    report = {
        "checked": checked,
        "mismatch_count": len(mismatches),
        "unsegmentable_count": len(unsegmentable),
        "mismatches": mismatches,
        "unsegmentable": unsegmentable,
    }
    if args.json_output:
        args.json_output.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    print(
        f"Checked {checked} records: {len(mismatches)} mismatches, "
        f"{len(unsegmentable)} unsegmentable pinyin readings."
    )
    for item in mismatches[:100]:
        print(
            f"MISMATCH {item['id']} {item['word']} {item['pinyin']}: "
            f"expected {item['expected']} / actual {item['actual']}"
        )
    for item in unsegmentable[:100]:
        print(
            f"UNSEGMENTABLE {item['id']} {item['word']} "
            f"{item['pinyin']} / {item['zhuyin']}"
        )

    return 1 if mismatches or unsegmentable else 0


if __name__ == "__main__":
    sys.exit(main())
