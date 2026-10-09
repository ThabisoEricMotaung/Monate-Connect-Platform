"""
Guard for the retired Python tender collectors.

Tender collection runs in the TypeScript collectors (src/lib/collectors),
called daily by the Vercel cron /api/cron/collect-tenders (see vercel.json).
The Python collectors write rows without stable references, with wrong
closing times and with listing previews as titles, so their entry points
refuse to run unless explicitly re-enabled with
ALLOW_LEGACY_PYTHON_COLLECTORS=1.
"""

import os
import sys


def exit_unless_legacy_collectors_enabled(entry_point: str) -> None:
    if os.environ.get("ALLOW_LEGACY_PYTHON_COLLECTORS") == "1":
        return
    sys.stderr.write(
        f"{entry_point}: the Python tender collectors are retired; collection runs via "
        "/api/cron/collect-tenders (vercel.json). Set ALLOW_LEGACY_PYTHON_COLLECTORS=1 to run them anyway.\n"
    )
    sys.exit(2)
