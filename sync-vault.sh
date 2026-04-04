#!/usr/bin/env bash
set -euo pipefail

VAULT="/home/brad/Documents/Vault/2-Areas/Bible"
SITE="/home/brad/Documents/BibleBrad/content"

echo "==> Syncing Teachings..."
rsync -av --delete \
  --exclude='*.sync-conflict-*' \
  --exclude='*.pdf' \
  --exclude='*.xlsx' \
  --exclude='Avi ben*' \
  "$VAULT/Teaching/" \
  "$SITE/Teachings/"

echo ""
echo "==> Syncing Notes (publish: true only)..."
python3 - <<'PYEOF'
import glob, re, shutil, os

src = "/home/brad/Documents/Vault/2-Areas/Bible/Topics"
dst = "/home/brad/Documents/BibleBrad/content/Notes"
os.makedirs(dst, exist_ok=True)

dst_files = {os.path.basename(f) for f in glob.glob(f"{dst}/*.md")}
published = set()

for path in glob.glob(f"{src}/*.md"):
    fname = os.path.basename(path)
    if '.sync-conflict-' in fname:
        continue
    with open(path) as f:
        content = f.read()
    m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if m and re.search(r'^\s*publish:\s*true\s*$', m.group(1), re.MULTILINE):
        shutil.copy2(path, os.path.join(dst, fname))
        published.add(fname)

for stale in dst_files - published:
    os.remove(os.path.join(dst, stale))

print(f"Synced {len(published)} Notes")
PYEOF

echo ""
echo "Done. Run 'npx quartz build --serve' to preview."
