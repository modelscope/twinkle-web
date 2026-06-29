#!/usr/bin/env python3
"""Check for broken internal links in Hugo content files.

Scans all .md files under content/ for Markdown links and verifies:
1. Internal relative links resolve to existing Hugo pages
2. External links (http/https) are reachable (optional, off by default)

Usage:
    python3 scripts/check-links.py [--check-external]
"""

import re
import sys
from pathlib import Path
from urllib.parse import unquote

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

WEB_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = WEB_ROOT / "content"

# Regex to find Markdown links: [text](url) but NOT images ![alt](url)
# Also handles optional title: [text](url "title")
LINK_RE = re.compile(r'(?<!!)\[([^\]]*)\]\(([^)" ]+)(?:\s+"[^"]*")?\)')

# Skip patterns
SKIP_PREFIXES = (
    "http://", "https://", "mailto:", "#", "{{",
    "/",  # site-root absolute paths handled by Hugo, not filesystem
)


def resolve_link(md_file: Path, link_target: str) -> tuple[bool, str]:
    """Check if a relative link resolves to an existing file/page.
    
    Returns (is_valid, reason).
    """
    # Decode URL encoding
    target = unquote(link_target)
    
    # Strip anchor
    if "#" in target:
        target = target.split("#")[0]
    if not target:
        return True, "anchor-only"

    # Hugo leaf pages (non _index.md / index.md) get their own virtual directory.
    # e.g. content/docs/getting-started.md -> URL /docs/getting-started/
    # Relative links resolve from that virtual directory, not the parent.
    # But _index.md (branch bundle) and index.md (leaf bundle) use parent dir.
    if md_file.name.startswith("_index") or md_file.stem == "index" or md_file.stem == "index.zh":
        base_dir = md_file.parent
    else:
        # Strip language suffix (.zh.md -> stem is still file.zh, we need the base stem)
        stem = md_file.stem
        if stem.endswith(".zh"):
            stem = stem[:-3]
        base_dir = md_file.parent / stem

    resolved = (base_dir / target).resolve()

    # Check direct file existence
    if resolved.exists():
        return True, "file exists"

    # Hugo page bundles: foo/ -> foo/_index.md or foo.md
    if not resolved.suffix:
        # Try as directory with _index.md
        index_path = resolved / "_index.md"
        if index_path.exists():
            return True, "directory index"
        # Try with .md extension
        md_path = resolved.with_suffix(".md")
        if md_path.exists():
            return True, "md file"
        # Try with .zh.md extension
        zh_path = resolved.parent / (resolved.name + ".zh.md")
        if zh_path.exists():
            return True, "zh.md file"

    # For .md links, check without extension too
    if target.endswith(".md"):
        no_ext = resolved.with_suffix("")
        if no_ext.exists() and no_ext.is_dir():
            return True, "directory"

    return False, f"not found: {resolved}"


def check_external_link(url: str) -> tuple[bool, str]:
    """Check if an external URL is reachable."""
    import urllib.request
    import urllib.error
    try:
        req = urllib.request.Request(url, method='HEAD')
        req.add_header('User-Agent', 'Mozilla/5.0 (link-checker)')
        resp = urllib.request.urlopen(req, timeout=10)
        return True, f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}"
    except Exception as e:
        return False, str(e)


def main():
    check_external = "--check-external" in sys.argv
    
    broken_links = []
    total_links = 0
    
    md_files = sorted(CONTENT_DIR.rglob("*.md"))
    print(f"[check-links] Scanning {len(md_files)} markdown files in {CONTENT_DIR}")
    
    for md_file in md_files:
        content = md_file.read_text(encoding="utf-8", errors="replace")
        
        for match in LINK_RE.finditer(content):
            link_text = match.group(1)
            link_target = match.group(2)
            total_links += 1
            
            # Skip external/special links
            if any(link_target.startswith(p) for p in SKIP_PREFIXES):
                if check_external and link_target.startswith(("http://", "https://")):
                    valid, reason = check_external_link(link_target)
                    if not valid:
                        rel_path = md_file.relative_to(WEB_ROOT)
                        broken_links.append((rel_path, link_text, link_target, reason))
                continue
            
            valid, reason = resolve_link(md_file, link_target)
            if not valid:
                rel_path = md_file.relative_to(WEB_ROOT)
                broken_links.append((rel_path, link_text, link_target, reason))
    
    # Report
    print(f"\n[check-links] Total links scanned: {total_links}")
    print(f"[check-links] Broken links found: {len(broken_links)}")
    
    if broken_links:
        print("\n" + "=" * 80)
        print("BROKEN LINKS:")
        print("=" * 80)
        for file_path, text, target, reason in broken_links:
            print(f"\n  File: {file_path}")
            print(f"  Link: [{text}]({target})")
            print(f"  Reason: {reason}")
        print("\n" + "=" * 80)
        sys.exit(1)
    else:
        print("\n[check-links] All internal links are valid! ✓")
        sys.exit(0)


if __name__ == "__main__":
    main()
