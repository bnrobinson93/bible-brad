#!/usr/bin/env bash
set -euo pipefail

VAULT="/home/brad/Documents/Vault/2-Areas/Bible"
SITE="/home/brad/Documents/code/bible-brad/content"

# Vault "Teaching" notes land at the top level of the site: content/<Name>.md -> /<name>
# --delete is scoped by the protect rules below so it can never touch index.md,
# notes/, or anything else that isn't a synced teaching.
echo "==> Syncing vault Teaching notes to the site root..."
rsync -av --delete \
  --exclude='*.sync-conflict-*' \
  --exclude='*.pdf' \
  --exclude='*.xlsx' \
  --exclude='Avi ben*' \
  --filter='protect index.md' \
  --filter='protect notes/***' \
  "$VAULT/Teaching/" \
  "$SITE/"

echo ""
echo "==> Syncing notes (publish: true only)..."
python3 - <<'PYEOF'
import glob, re, shutil, os

src = "/home/brad/Documents/Vault/2-Areas/Bible/Topics"
dst = "/home/brad/Documents/code/bible-brad/content/notes"
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

print(f"Synced {len(published)} notes")
PYEOF

echo ""
echo "Done. Run 'npx quartz build --serve' to preview."
