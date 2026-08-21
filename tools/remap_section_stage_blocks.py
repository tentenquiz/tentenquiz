from __future__ import annotations

from collections import Counter
import argparse
import json
from pathlib import Path
import shutil


parser = argparse.ArgumentParser()
parser.add_argument("data_path", type=Path)
parser.add_argument("backup_path", type=Path)
parser.add_argument(
    "mapping",
    help="comma-separated old:new stage pairs, for example 1:1,6:2,5:3",
)
args = parser.parse_args()

stage_remap = {}
for pair in args.mapping.split(","):
    old_text, new_text = pair.split(":", 1)
    stage_remap[int(old_text)] = int(new_text)

if set(stage_remap) != set(range(1, 11)) or set(stage_remap.values()) != set(range(1, 11)):
    raise SystemExit("mapping must be a one-to-one mapping of stages 1 through 10")

rows = json.loads(args.data_path.read_text(encoding="utf-8"))
expected_counts = Counter({stage: 25 for stage in range(1, 11)})
if len(rows) != 250 or Counter(row["stage"] for row in rows) != expected_counts:
    raise SystemExit("source must contain 250 rows with 25 records in every stage")

if not args.backup_path.exists():
    args.backup_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(args.data_path, args.backup_path)

for row in rows:
    row["stage"] = stage_remap[row["stage"]]

rows.sort(key=lambda row: (row["stage"], row["id"]))
if Counter(row["stage"] for row in rows) != expected_counts:
    raise SystemExit("remapped stage distribution is invalid")

args.data_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"OK: remapped {args.data_path.name}; backup={args.backup_path}")
