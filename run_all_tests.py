from __future__ import annotations

import subprocess
import sys


def run(cmd: list[str]) -> int:
    print("\n$ " + " ".join(cmd))
    p = subprocess.run(cmd)
    return p.returncode


def main() -> int:
    # 1) Endpoint runner (codebase-wide, attempts to create minimal data)
    rc1 = run([sys.executable, "test_all_endpoints_codebase.py"])

    # 2) HF + ML unit smoke
    rc2 = run([sys.executable, "test_ml_hf_and_features.py"])

    return 1 if (rc1 != 0 or rc2 != 0) else 0


if __name__ == "__main__":
    raise SystemExit(main())

