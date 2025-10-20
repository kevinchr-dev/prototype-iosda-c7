#!/usr/bin/env python3
# python3 scripts/generate_manifest.py
"""Generate photos/manifest.json from the current photo assets."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PHOTOS_DIR = ROOT / "photos"
MANIFEST_PATH = PHOTOS_DIR / "manifest.json"

SUPPORTED_SUFFIXES = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}


def photo_paths() -> list[str]:
    if not PHOTOS_DIR.exists():
        raise SystemExit(f"Photos directory not found: {PHOTOS_DIR}")

    files = [
        path for path in PHOTOS_DIR.iterdir()
        if path.is_file()
        and path.name != MANIFEST_PATH.name
        and path.suffix.lower() in SUPPORTED_SUFFIXES
        and not path.name.startswith('.')
    ]

    files.sort(key=lambda p: p.name.lower())
    return [f"./photos/{path.name}" for path in files]


def write_manifest(entries: list[str]) -> None:
    data = {"photos": entries}
    MANIFEST_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    entries = photo_paths()
    write_manifest(entries)
    print(f"Manifest updated with {len(entries)} photos -> {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
