#!/usr/bin/env bash
set -euo pipefail

VAULT="/home/brad/Documents/Vault/2-Areas/Bible"
SITE="/home/brad/Documents/code/bible-brad/content"

# One gate for the whole site: the vault's evergreen tag (0🌲). A note is
# vouched or it is not; there is no separate publish flag to keep in sync.
# Quartz's explicit-publish plugin wants `publish: true`, so it is stamped
# into the copy here, never into the vault.
#   Teaching/  -> content/<Name>.md        (site root)
#   Topics/    -> content/notes/<Name>.md
python3 - <<'PYEOF'
import glob, re, os
from pathlib import Path

VAULT = Path("/home/brad/Documents/Vault/2-Areas/Bible")
SITE = Path("/home/brad/Documents/code/bible-brad/content")
PROTECT = {"index.md"}
FM = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)

def evergreen(text):
    m = FM.match(text)
    return bool(m) and re.search(r"^\s*-\s*0🌲\s*$|^tags:\s*(0🌲\s*$|\[[^\]]*0🌲)", m.group(1), re.M) is not None

def stamp_publish(text):
    m = FM.match(text)
    fm = re.sub(r"^publish:.*\n", "", m.group(1) + "\n", flags=re.M)
    return f"---\n{fm}publish: true\n---\n" + text[m.end():]

for src, dst in ((VAULT / "Teaching", SITE), (VAULT / "Topics", SITE / "notes")):
    dst.mkdir(exist_ok=True)
    keep = set()
    for path in src.glob("*.md"):
        if ".sync-conflict-" in path.name:
            continue
        text = path.read_text()
        if not evergreen(text):
            continue
        (dst / path.name).write_text(stamp_publish(text))
        keep.add(path.name)
    for stale in dst.glob("*.md"):
        if stale.name not in keep and stale.name not in PROTECT:
            stale.unlink()
    print(f"{src.name}: synced {len(keep)} evergreen notes -> {dst.relative_to(SITE.parent)}")
PYEOF

echo ""
echo "==> Tidying link footers..."
"$(dirname "$0")/tidy-synced-notes.py"

echo ""
echo "Done. Run 'npx quartz build --serve' to preview."
