#!/usr/bin/env python3
"""Normalise the link footer at the bottom of each synced note.

Vault notes end with a "Links" section that mixes three things: wikilinks to
other notes, wikilinks to vault-only notes that were never published, and bare
Zettelkasten IDs. On the site the last two render as dead ends, so this script
rewrites the section to keep only the links that resolve to a published page,
under the heading "Related Reading". A section with nothing left is removed.

Run from anywhere; the content directory is resolved relative to this file.
"""

import re
import sys
from pathlib import Path

CONTENT = Path(__file__).resolve().parent / "content"
HEADING = re.compile(r"^#{1,6}\s*links:?\s*$", re.IGNORECASE)
WIKILINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
NEW_HEADING = "## Related Reading"


def published_pages():
    pages = list(CONTENT.glob("*.md")) + list(CONTENT.glob("notes/*.md"))
    return {page.stem.lower(): page.stem for page in pages}


def rewrite(text, own_name, pages):
    lines = text.split("\n")
    start = next((i for i, line in enumerate(lines) if HEADING.match(line)), None)
    if start is None:
        return text

    kept = []
    for target in WIKILINK.findall("\n".join(lines[start + 1 :])):
        name = pages.get(target.strip().lower())
        if name is None or name.lower() == own_name.lower() or name in kept:
            continue
        kept.append(name)

    body = [NEW_HEADING, ""] + [f"- [[{name}]]" for name in kept] if kept else []
    head = lines[:start]
    while head and not head[-1].strip():
        head.pop()
    return "\n".join(head + ([""] + body if body else []) + [""])


def main():
    pages = published_pages()
    changed = 0
    for page in sorted(CONTENT.glob("*.md")) + sorted(CONTENT.glob("notes/*.md")):
        text = page.read_text()
        updated = rewrite(text, page.stem, pages)
        if updated != text:
            page.write_text(updated)
            changed += 1
    print(f"Tidied link footers in {changed} files")


if __name__ == "__main__":
    sys.exit(main())
