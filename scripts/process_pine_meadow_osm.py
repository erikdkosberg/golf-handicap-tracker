#!/usr/bin/env python3
"""Legacy entry point — use scripts/courses/process_course.py instead."""
import subprocess
import sys
from pathlib import Path

CONFIG = Path(__file__).resolve().parent / "courses" / "configs" / "pine-meadow.json"
SCRIPT = Path(__file__).resolve().parent / "courses" / "process_course.py"

if __name__ == "__main__":
    subprocess.check_call([sys.executable, str(SCRIPT), str(CONFIG)])
