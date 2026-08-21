from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from hashlib import sha256
import json
from pathlib import Path
import re


SECTIONS = (
    "nature_weather",
    "people_relations",
    "body_health",
    "food_drink",
    "home_daily_life",
    "activities_leisure",
    "places_transport",
    "school_work",
    "shopping_money",
    "time_calendar",
)
LANGS = ("en", "ko", "ja", "zh_cn", "zh_tw", "fr", "de", "es", "vi", "ar", "it", "ru")
AUDIO_FIELDS = tuple(f"audioFile_{lang}" for lang in LANGS)
EXPECTED_FIELDS = (
    "id",
    "section",
    "stage",
    *(f"word_{lang}" for lang in LANGS),
    "reading_en",
    "reading_ko",
    "reading_ja",
    "reading_zh_cn",
    "reading_zh_tw",
    "zhuyin_zh_tw",
    "reading_fr",
    "reading_de",
    "reading_es",
    "reading_vi",
    "reading_ar",
    "reading_it",
    "reading_ru",
    *(f"note_{lang}" for lang in LANGS),
    *AUDIO_FIELDS,
)

KATAKANA_RE = re.compile(r"[ァ-ヶー]")
HIRAGANA_RE = re.compile(r"^[ぁ-ゖゝゞ]+$")
EMOJI_RE = re.compile(
    "["
    "\U0001F1E6-\U0001F1FF"
    "\U0001F300-\U0001FAFF"
    "\U00002600-\U000027BF"
    "]"
)
NOTE_END_RE = re.compile(r"[.!?。！？]$")


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def add_error(errors: list[dict[str, object]], section: str, row_number: int | None, message: str) -> None:
    errors.append({"section": section, "row": row_number, "message": message})


def audit(data_dir: Path, index_path: Path, mirror_dir: Path | None) -> dict[str, object]:
    errors: list[dict[str, object]] = []
    warnings: list[dict[str, object]] = []
    section_summaries: dict[str, object] = {}
    all_rows: list[dict[str, object]] = []
    global_ids: dict[str, list[str]] = defaultdict(list)
    value_locations: dict[str, dict[str, list[dict[str, object]]]] = {
        f"word_{lang}": defaultdict(list) for lang in LANGS
    }

    expected_files = {f"{section}.json" for section in SECTIONS}
    present_files = {path.name for path in data_dir.glob("*.json") if ".backup." not in path.name}
    for missing in sorted(expected_files - present_files):
        add_error(errors, missing.removesuffix(".json"), None, "expected data file is missing")
    for extra in sorted(present_files - expected_files):
        warnings.append({"section": extra.removesuffix(".json"), "row": None, "message": "unregistered extra JSON file"})

    for section in SECTIONS:
        path = data_dir / f"{section}.json"
        if not path.exists():
            continue
        try:
            rows = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001 - audit must report malformed input
            add_error(errors, section, None, f"invalid JSON: {exc}")
            continue

        if not isinstance(rows, list):
            add_error(errors, section, None, "JSON root is not an array")
            continue

        stage_counts: Counter[int] = Counter()
        within_ids: Counter[str] = Counter()
        within_values: dict[str, Counter[str]] = {
            f"word_{lang}": Counter() for lang in LANGS
        }
        within_values.update({f"reading_{lang}": Counter() for lang in LANGS})

        for row_number, row in enumerate(rows, 1):
            if not isinstance(row, dict):
                add_error(errors, section, row_number, "record is not an object")
                continue
            if tuple(row) != EXPECTED_FIELDS:
                add_error(errors, section, row_number, "field order or 52-field schema is invalid")

            row_id = str(row.get("id", ""))
            within_ids[row_id] += 1
            global_ids[row_id].append(section)
            if row.get("section") != section:
                add_error(errors, section, row_number, f"section field is {row.get('section')!r}")
            stage = row.get("stage")
            if not isinstance(stage, int) or not 1 <= stage <= 10:
                add_error(errors, section, row_number, f"invalid stage {stage!r}")
            else:
                stage_counts[stage] += 1

            for field in EXPECTED_FIELDS:
                value = row.get(field)
                if field in AUDIO_FIELDS:
                    lang = field.removeprefix("audioFile_")
                    expected_audio = f"audio/{lang}/{section}/{row_id}.mp3"
                    if value not in ("", expected_audio):
                        add_error(
                            errors,
                            section,
                            row_number,
                            f"{field} is not empty or the canonical path {expected_audio!r}",
                        )
                elif field != "stage" and (not isinstance(value, str) or not value.strip()):
                    add_error(errors, section, row_number, f"{field} is empty or not text")

            japanese = "".join(str(row.get(field, "")) for field in ("word_ja", "reading_ja"))
            if KATAKANA_RE.search(japanese):
                add_error(errors, section, row_number, "katakana found in Japanese word/reading")
            reading_ja = str(row.get("reading_ja", ""))
            if reading_ja and not HIRAGANA_RE.fullmatch(reading_ja):
                add_error(errors, section, row_number, "Japanese reading is not hiragana only")

            for lang in LANGS:
                word_field = f"word_{lang}"
                reading_field = f"reading_{lang}"
                word = str(row.get(word_field, "")).strip()
                reading = str(row.get(reading_field, "")).strip()
                within_values[word_field][word.casefold()] += 1
                within_values[reading_field][reading.casefold()] += 1
                if word:
                    value_locations[word_field][word.casefold()].append(
                        {"section": section, "id": row_id, "stage": stage, "value": word}
                    )

                note_field = f"note_{lang}"
                note = str(row.get(note_field, "")).strip()
                if note and not NOTE_END_RE.search(note):
                    add_error(errors, section, row_number, f"{note_field} is not a finished sentence")
                if EMOJI_RE.search(word + reading + note):
                    add_error(errors, section, row_number, f"emoji found in {lang} data")

            all_rows.append(row)

        if len(rows) != 250:
            add_error(errors, section, None, f"record count is {len(rows)}, expected 250")
        for stage in range(1, 11):
            if stage_counts[stage] != 25:
                add_error(errors, section, None, f"stage {stage} has {stage_counts[stage]} records, expected 25")
        for row_id, count in within_ids.items():
            if count > 1:
                add_error(errors, section, None, f"duplicate id {row_id!r} within section")
        for field, counts in within_values.items():
            for value, count in counts.items():
                if value and count > 1:
                    add_error(errors, section, None, f"duplicate {field} value {value!r} within section")

        mirror_hash = None
        mirror_match = None
        if mirror_dir:
            mirror_path = mirror_dir / path.name
            if mirror_path.exists():
                mirror_hash = digest(mirror_path)
                mirror_match = mirror_hash == digest(path)
                if not mirror_match:
                    add_error(errors, section, None, "workspace and deployed data hashes differ")
            else:
                add_error(errors, section, None, "deployed mirror file is missing")

        section_summaries[section] = {
            "records": len(rows),
            "fields": len(EXPECTED_FIELDS),
            "stage_counts": {str(stage): stage_counts[stage] for stage in range(1, 11)},
            "sha256": digest(path),
            "mirror_sha256": mirror_hash,
            "mirror_match": mirror_match,
        }

    for row_id, sections in global_ids.items():
        if len(sections) > 1:
            add_error(errors, "GLOBAL", None, f"id {row_id!r} occurs in {sections}")

    cross_language_counts: dict[str, int] = {}
    english_cross_section: list[dict[str, object]] = []
    for field, values in value_locations.items():
        duplicate_concepts = []
        for normalized, locations in values.items():
            sections = sorted({str(location["section"]) for location in locations})
            if len(sections) > 1:
                duplicate_concepts.append((normalized, locations, sections))
        cross_language_counts[field] = len(duplicate_concepts)
        if field == "word_en":
            for normalized, locations, sections in sorted(duplicate_concepts):
                english_cross_section.append(
                    {
                        "normalized": normalized,
                        "sections": sections,
                        "occurrences": locations,
                    }
                )

    index_text = index_path.read_text(encoding="utf-8") if index_path.exists() else ""
    registered = re.findall(r"['\"]([a-z_]+\.json)['\"]", index_text)
    registered_expected = [name for name in registered if name in expected_files]
    expected_order = [f"{section}.json" for section in SECTIONS]
    if registered_expected != expected_order:
        add_error(errors, "APP", None, f"index registrations are {registered_expected}, expected {expected_order}")

    return {
        "status": "PASS" if not errors else "FAIL",
        "section_count": len(section_summaries),
        "record_count": len(all_rows),
        "global_unique_id_count": len(global_ids),
        "expected_fields_per_record": len(EXPECTED_FIELDS),
        "registered_files": registered_expected,
        "sections": section_summaries,
        "cross_section_exact_headword_counts": cross_language_counts,
        "cross_section_english_headwords": english_cross_section,
        "errors": errors,
        "warnings": warnings,
    }


def render_markdown(report: dict[str, object]) -> str:
    lines = [
        "# TentenQuiz 글로벌 데이터 통합 감사",
        "",
        f"- 결과: **{report['status']}**",
        f"- 섹션: {report['section_count']}개",
        f"- 전체 레코드: {report['record_count']}개",
        f"- 전역 고유 ID: {report['global_unique_id_count']}개",
        f"- 레코드당 필드: {report['expected_fields_per_record']}개",
        "- 단계 구성: 각 섹션 1~10단계, 단계당 25개",
        "- 언어: 12개",
        "",
        "## 섹션별 확인",
        "",
        "| 섹션 | 레코드 | 단계별 개수 | 배포본 일치 | SHA-256 |",
        "|---|---:|---|---|---|",
    ]
    for section, summary in report["sections"].items():
        stage_counts = summary["stage_counts"]
        compact_stages = ", ".join(f"{stage}:{count}" for stage, count in stage_counts.items())
        mirror = "예" if summary["mirror_match"] else ("미검사" if summary["mirror_match"] is None else "아니요")
        lines.append(
            f"| {section} | {summary['records']} | {compact_stages} | {mirror} | `{summary['sha256']}` |"
        )

    lines.extend(
        [
            "",
            "## 교차 섹션 동일 표제어",
            "",
            "같은 표제어가 서로 다른 생활 영역에서 필요한 경우가 있어, 아래 수치는 오류 수가 아니라 검토 대상 수입니다.",
            "",
            "| 언어 필드 | 동일 표제어 수 |",
            "|---|---:|",
        ]
    )
    for field, count in report["cross_section_exact_headword_counts"].items():
        lines.append(f"| {field} | {count} |")

    english = report["cross_section_english_headwords"]
    frequent = sorted(english, key=lambda item: (-len(item["sections"]), item["normalized"]))
    lines.extend(
        [
            "",
            "### 3개 이상 섹션에 겹치는 영어 표제어",
            "",
            "| 표제어 | 섹션 수 | 섹션 |",
            "|---|---:|---|",
        ]
    )
    any_frequent = False
    for item in frequent:
        if len(item["sections"]) < 3:
            continue
        any_frequent = True
        lines.append(f"| {item['normalized']} | {len(item['sections'])} | {', '.join(item['sections'])} |")
    if not any_frequent:
        lines.append("| 없음 | 0 | - |")

    lines.extend(["", "## 오류", ""])
    if report["errors"]:
        for error in report["errors"]:
            where = error["section"]
            if error["row"] is not None:
                where += f" #{error['row']}"
            lines.append(f"- {where}: {error['message']}")
    else:
        lines.append("- 구조·형식·등록·배포본 일치 검사에서 오류가 발견되지 않았습니다.")

    lines.extend(["", "## 판정 기준", ""])
    lines.extend(
        [
            "- 교차 섹션 중복은 곧바로 삭제하지 않습니다. 같은 단어가 각 영역에서 핵심 개념이면 유지할 수 있습니다.",
            "- 한 섹션 안의 ID·표제어·읽기 중복은 오류로 처리합니다.",
            "- 일본어 표제어·읽기의 가타카나, 규칙과 다른 오디오 경로, 빈 번역·읽기·노트는 오류로 처리합니다.",
            "- 일본어 노트에는 현지인에게 자연스러운 설명을 위해 가타카나를 허용합니다.",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir", type=Path)
    parser.add_argument("index_path", type=Path)
    parser.add_argument("output_json", type=Path)
    parser.add_argument("output_markdown", type=Path)
    parser.add_argument("--mirror-dir", type=Path)
    args = parser.parse_args()

    report = audit(args.data_dir, args.index_path, args.mirror_dir)
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_markdown.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.output_markdown.write_text(render_markdown(report), encoding="utf-8")
    print(
        f"{report['status']}: sections={report['section_count']} records={report['record_count']} "
        f"unique_ids={report['global_unique_id_count']} errors={len(report['errors'])}"
    )
    print(f"JSON: {args.output_json}")
    print(f"Markdown: {args.output_markdown}")


if __name__ == "__main__":
    main()
