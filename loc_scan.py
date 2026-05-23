from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXCLUDED_DIRS = {".git", ".venv", "__pycache__", "ml_artifacts", "node_modules"}

EXTS = {".py", ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".md", ".json", ".yml", ".yaml"}


def main() -> None:
    total = 0
    by_ext: dict[str, int] = {}

    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        if any(part in EXCLUDED_DIRS for part in p.parts):
            continue
        if p.suffix.lower() not in EXTS:
            continue

        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        loc = sum(1 for ln in text.splitlines() if ln.strip() != "")
        total += loc
        by_ext[p.suffix.lower()] = by_ext.get(p.suffix.lower(), 0) + loc

    print("Non-empty LOC estimate (codebase-wide):")
    print("Total:", total)
    for k in sorted(by_ext.keys()):
        print(f"  {k}: {by_ext[k]}")


if __name__ == "__main__":
    main()

