#!/usr/bin/env python3
"""Clean up vault notes after they are synced into content/.

Three things the vault does that do not survive the trip to the site:

1. Notes end with a "Links" section mixing wikilinks to other notes, wikilinks
   to vault-only notes that were never published, and bare Zettelkasten IDs.
   Only the first kind resolves, so the section is rewritten to keep those and
   is dropped entirely when nothing is left.
2. Some notes carry an alias identical to their own filename. Quartz emits a
   redirect page for every alias, and a self-referential one overwrites the
   real page with a redirect to itself, which browsers reload forever.
3. Some notes link to themselves, by filename or by alias. On the site that only
   reloads the page the reader is on, so those links become plain text.

Run from anywhere; the content directory is resolved relative to this file.
"""

import re
import sys
from pathlib import Path

CONTENT = Path(__file__).resolve().parent / "content"
HEADING = re.compile(r"^#{1,6}\s*links:?\s*$", re.IGNORECASE)
WIKILINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
NEW_HEADING = "## Related Reading"
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
ALIAS_ITEM = re.compile(r"^\s*-\s*(.*?)\s*$")
# Skips embeds and [[note#heading]] links, which still go somewhere. The optional
# backslash is Obsidian's escaped pipe inside a table.
SELF_LINK = re.compile(r"(?<!!)\[\[([^\]|#\\]+)(?:\\?\|([^\]]*))?\]\]")


def published_pages():
    pages = list(CONTENT.glob("*.md")) + list(CONTENT.glob("notes/*.md"))
    return {page.stem.lower(): page.stem for page in pages}


def drop_self_aliases(text, own_name):
    """Remove alias entries that just repeat the note's own filename."""
    match = FRONTMATTER.match(text)
    if match is None:
        return text

    lines = match.group(1).split("\n")
    kept, index = [], 0
    while index < len(lines):
        line = lines[index]
        kept.append(line)
        index += 1
        if line.strip() != "aliases:":
            continue
        aliases = []
        while index < len(lines) and ALIAS_ITEM.match(lines[index]):
            item = ALIAS_ITEM.match(lines[index]).group(1).strip("\"'")
            if item.lower() != own_name.lower():
                aliases.append(lines[index])
            index += 1
        if aliases:
            kept.extend(aliases)
        else:
            kept.pop()  # the key itself, now that it has no values

    return "---\n" + "\n".join(kept) + "\n---\n" + text[match.end() :]


def unlink_self(text, own_name, pages):
    """Turn links to this note into their display text."""
    match = FRONTMATTER.match(text)
    end = match.end() if match else 0
    names = set()
    if match:
        block = re.search(r"^aliases:\s*\n((?:[ \t]+-.*\n?)+)", match.group(1), re.M)
        if block:
            names = {ALIAS_ITEM.match(line).group(1).strip("\"'").lower() for line in block.group(1).splitlines()}
    # Quartz resolves by filename, so an alias that is also a page's name goes there.
    names = (names - pages.keys()) | {own_name.lower()}

    def plain(link):
        target = link.group(1).split("/")[-1].strip()
        return (link.group(2) or target) if target.lower() in names else link.group(0)

    return text[:end] + SELF_LINK.sub(plain, text[end:])


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
        updated = unlink_self(drop_self_aliases(text, page.stem), page.stem, pages)
        updated = rewrite(updated, page.stem, pages)
        if updated != text:
            page.write_text(updated)
            changed += 1
    print(f"Tidied {changed} files")


def self_test():
    pages = {"lord": "LORD", "god": "God", "moses": "Moses"}
    note = (
        '---\ncategories:\n  - "[[LORD]]"\naliases:\n  - YHVH\n  - Moses\n---\n'
        "[[YHVH]] [[LORD|the name]] [[a/b/LORD]] [[lord\\|x]] [[God]] [[Moses]] ![[LORD]] [[LORD#Name]]\n"
    )
    got = unlink_self(note, "LORD", pages)
    assert got.endswith("\nYHVH the name LORD x [[God]] [[Moses]] ![[LORD]] [[LORD#Name]]\n"), got
    assert '- "[[LORD]]"' in got, got  # frontmatter untouched
    print("tidy-synced-notes self-test: OK")


if __name__ == "__main__":
    sys.exit(self_test() if "--self-test" in sys.argv else main())
