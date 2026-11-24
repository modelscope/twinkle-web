#!/usr/bin/env python3
"""Prepare static site content from locked source repositories.

Outputs (all regenerated on every run, never hand-edited):
  content/docs/5.0.0.dev/**   SWIFT v5 docs (from ms-swift docs/v5/source{,_en})
                              + twinkle reference (from twinkle docs/source_{en,zh})
  content/news.json           first News item of each README
  content/site-data.json      model registry count + source commits
  content/perf.json           validated perf snapshot or {status: pending}
  public/images/**            community/brand assets from ms-swift asset/

Source baselines are locked in content-sources.json. Local dev reads sibling
checkouts (override with SWIFT_REPO_DIR / TWINKLE_REPO_DIR / REGRESSION_DIR);
CI checks out the locked commits into .sources/ first. A HEAD mismatch is an
error unless ALLOW_DIRTY_SOURCES=1 (local iteration only).
"""

import os
import posixpath
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

import json

WEB_ROOT = Path(__file__).resolve().parent.parent
VERSION = "5.0.0.dev"
DOCS_OUT = WEB_ROOT / "content" / "docs" / VERSION
ALLOW_DIRTY = os.environ.get("ALLOW_DIRTY_SOURCES") == "1"


def fail(msg):
    print(f"[prepare-content] ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def git_head(repo: Path) -> str:
    return subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "HEAD"], capture_output=True, text=True, check=True
    ).stdout.strip()


def resolve_sources():
    manifest = json.loads((WEB_ROOT / "content-sources.json").read_text())
    roots = {}
    for name, spec in manifest["sources"].items():
        env = {"swift": "SWIFT_REPO_DIR", "twinkle": "TWINKLE_REPO_DIR", "regression": "REGRESSION_DIR"}[name]
        candidates = [os.environ.get(env), WEB_ROOT / ".sources" / name]
        if name == "swift":
            # twinkle-web is nested inside the ms-swift checkout
            candidates.append(WEB_ROOT.parent)
        else:
            sibling = {"twinkle": "twinkle", "regression": "swift5-regression-exps"}[name]
            candidates += [WEB_ROOT.parent / sibling, WEB_ROOT.parent / name]
        marker = {"swift": "swift/version.py", "twinkle": "docs/source_en/index.rst", "regression": "BASELINE.md"}[name]
        root = next((Path(c) for c in candidates if c and Path(c).exists() and (Path(c) / marker).exists()), None)
        if root is None:
            fail(f'source repo "{name}" not found; set {env} or checkout into .sources/{name}')
        head = git_head(root)
        if head != spec["commit"] and not ALLOW_DIRTY:
            fail(
                f"{name} HEAD {head[:9]} != locked {spec['commit'][:9]}; "
                f"update content-sources.json or set ALLOW_DIRTY_SOURCES=1"
            )
        roots[name] = root
        print(f"[prepare-content] {name}: {root} @ {head[:9]}")
    return roots, manifest


# ---------------------------------------------------------------------------
# MDX conversion (markdown -> MDX-safe text)
# ---------------------------------------------------------------------------


def html_grid_to_markdown(text: str) -> str:
    """Convert the styled <div><table> component grids (twinkle Quick-Start)
    into markdown tables: each <td> holds <b>Name</b><sub>description</sub>."""

    def conv(m):
        block = m.group(0)
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", block, re.S)
        md_rows = []
        for row in rows:
            cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
            out_cells = []
            for cell in cells:
                name = re.search(r"<b>(.*?)</b>", cell, re.S)
                desc = re.search(r"<sub>(.*?)</sub>", cell, re.S)
                label = name.group(1).strip() if name else re.sub(r"<[^>]+>", "", cell).strip()
                d = desc.group(1).strip() if desc else ""
                out_cells.append(f"**{label}**" + (f" — {d}" if d else ""))
            if out_cells:
                md_rows.append("| " + " | ".join(out_cells) + " |")
        if not md_rows:
            return block
        header = md_rows[0]
        sep = "|" + "|".join(["---"] * len(re.findall(r"<td[^>]*>", rows[0]))) + "|"
        return "\n" + header + "\n" + sep + "\n" + "\n".join(md_rows[1:]) + "\n"

    return re.sub(r"<div[^>]*>\s*<table.*?</table>\s*</div>", conv, text, flags=re.S)


def mdx_escape(text: str, warnings: list, src: str) -> str:
    """Escape MDX expression/JSX triggers outside code fences and inline code."""
    text = html_grid_to_markdown(text)
    out, in_fence = [], False
    for line in text.splitlines(keepends=True):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence:
            out.append(line)
            continue
        # Split off inline code spans; escape only the prose parts.
        parts = re.split(r"(`[^`\n]*`)", line)
        for i, part in enumerate(parts):
            if part.startswith("`"):
                continue
            # autolinks <https://...> -> plain URL
            part = re.sub(r"<(https?://[^>]+)>", r"\1", part)
            # known harmless HTML -> markdown equivalents
            part = re.sub(r'<img\s+[^>]*src="([^"]+)"[^>]*/?>', r"![](\1)", part)
            part = re.sub(r"<b>(.*?)</b>", r"**\1**", part)
            part = re.sub(r"<sub>(.*?)</sub>", r"\1", part)
            part = re.sub(r"</?p[^>]*>", "", part)
            part = re.sub(r"<br\s*/?>", "  \n", part)
            # <image>/<video>/<audio> are literal media placeholders in the
            # twinkle data-format docs; escaping them to display as text is intended.
            probe = re.sub(r"</?(image|video|audio)>", "", part)
            if re.search(r"<[a-zA-Z/]", probe):
                warnings.append(f"{src}: unhandled HTML, escaped as text: {part.strip()[:80]}")
            part = part.replace("{", "\\{").replace("}", "\\}")
            part = part.replace("<", "\\<").replace(">", "\\>")
            parts[i] = part
        out.append("".join(parts))
    return "".join(out)


def split_frontmatter(body: str):
    title, desc = "", ""
    lines = body.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r"^#\s+(.+)", line)
        if m:
            title = m.group(1).strip()
            rest = lines[i + 1 :]
            body = "\n".join(rest).lstrip("\n")
            break
    for line in body.splitlines():
        s = line.strip()
        if s and not s.startswith(("#", "```", "!", "|", "-", ">")):
            desc = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)[:160]
            break
    return title, desc, body


def yaml_str(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


# ---------------------------------------------------------------------------
# SWIFT v5 docs: authored MDX, copied with editUrl injection
# ---------------------------------------------------------------------------


def copy_swift_v5(swift: Path, commit: str):
    # v5 docs live in docs/v5/source (zh) and docs/v5/source_en (en); the legacy
    # tree was moved to docs/v4. At deploy time CI clones the locked commit.
    pairs = [(swift / "docs" / "v5" / "source_en", ""), (swift / "docs" / "v5" / "source", ".zh")]
    count = 0
    for src_root, suffix in pairs:
        if not src_root.exists():
            fail(f"missing SWIFT v5 docs: {src_root}")
        for src in sorted(src_root.rglob("*")):
            rel = src.relative_to(src_root)
            if src.is_dir():
                continue
            if src.name == "meta.json":
                dest = DOCS_OUT / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)
                continue
            if src.suffix != ".mdx":
                fail(f"non-MDX file in v5 docs: {src}")
            dest = DOCS_OUT / rel.with_name(rel.stem + suffix + ".mdx")
            dest.parent.mkdir(parents=True, exist_ok=True)
            text = src.read_text()
            if "editUrl:" not in text:
                repo_path = src.relative_to(swift)
                url = f"https://github.com/modelscope/ms-swift/blob/{commit}/{repo_path}"
                text = re.sub(r"^---\n", f"---\neditUrl: {url}\n", text, count=1)
            dest.write_text(text)
            count += 1
    print(f"[prepare-content] swift v5 docs: {count} files")


# ---------------------------------------------------------------------------
# twinkle docs: toctree-paired EN/ZH import with slug mapping
# ---------------------------------------------------------------------------

EN_ZH_DIR_MAP = {
    "Usage Guide": "使用指引",
    "Components": "组件",
    "Server and Client": "服务端和客户端",
    "Dataset": "数据集",
    "Data Format": "数据格式",
    "Data Loading": "数据加载",
    "Template": "模板",
    "Preprocessor and Filter": "预处理器和过滤器",
    "Task Processor": "任务处理器",
    "Model": "模型",
    "Sampler": "采样器",
    "Reward": "奖励",
    "Advantage": "优势",
    "Gym": "Gym",
    "Hub": "Hub",
    "Checkpoint Engine": "检查点引擎",
    "Metrics": "指标",
    "Loss": "损失",
    "Loss Scale": "损失缩放",
    "LRScheduler": "LRScheduler",
    "Patch": "补丁",
    "Plugin": "组件化",
    "Kernel": "内核",
    "Training Middleware": "训练中间件",
    "CLI": "CLI",
    "Notifier": "通知器",
    "Agentic": "Agentic",
    "Auto": "Auto",
    "TUI": "TUI",
}
ZH_EN_DIR_MAP = {v: k for k, v in EN_ZH_DIR_MAP.items()}


def slugify(name: str) -> str:
    s = unquote(name).lower().strip()
    s = re.sub(r"[_ ]+", "-", s)
    s = re.sub(r"[^a-z0-9\-.]", "", s)
    s = re.sub(r"-{2,}", "-", s)
    return s.strip("-")


def seg_slug(name: str) -> str:
    return slugify(ZH_EN_DIR_MAP.get(unquote(name), name))


def parse_toctrees(rst: Path):
    """Return [(caption, [entries])] for EVERY toctree block in the file."""
    if not rst.exists():
        return []
    lines = rst.read_text().splitlines()
    blocks, caption, entries, in_tree = [], "", [], False
    # 末尾空行复用块结束逻辑，确保没有尾随换行的文件也能输出最后一个块。
    for line in [*lines, ""]:
        if line.strip().startswith(".. toctree::"):
            if entries:
                blocks.append((caption, entries))
            caption, entries, in_tree = "", [], True
            continue
        if in_tree:
            m = re.match(r"\s+:caption:\s*(.+)", line)
            if m:
                caption = m.group(1).strip()
                continue
            if re.match(r"\s+:", line):
                continue
            if line.strip():
                entries.append(line.strip())
            elif entries:
                blocks.append((caption, entries))
                caption, entries, in_tree = "", [], False
    return blocks


def parse_toctree(rst: Path):
    blocks = parse_toctrees(rst)
    return blocks[0] if blocks else ("", [])


def build_pairs(en_root: Path, zh_root: Path):
    """Walk paired toctrees; yield (en_file, zh_file, out_rel_dir, order)."""
    pairs, registry = [], {}

    def walk(en_rst: Path, zh_rst: Path, out_dir: str):
        en_blocks = parse_toctrees(en_rst)
        zh_blocks = parse_toctrees(zh_rst)
        for bi, (_, en_entries) in enumerate(en_blocks):
            zh_entries = zh_blocks[bi][1] if bi < len(zh_blocks) else []
            if len(en_entries) != len(zh_entries):
                print(
                    f"[prepare-content] WARN toctree length mismatch: {en_rst} ({len(en_entries)} vs {len(zh_entries)})"
                )
            for idx, en_entry in enumerate(en_entries):
                zh_entry = zh_entries[idx] if idx < len(zh_entries) else None
                en_path = (en_rst.parent / en_entry).resolve()
                zh_path = (zh_rst.parent / zh_entry).resolve() if zh_entry else None
                if en_entry.endswith(".rst"):
                    sub = slugify(en_path.parent.name) if en_path.name == "index.rst" else slugify(en_path.stem)
                    walk(en_path, zh_path or en_path, f"{out_dir}/{sub}" if out_dir else sub)
                    continue
                stem = slugify(en_path.stem)
                page = f"{out_dir}/{stem}" if out_dir else stem
                pairs.append((en_path, zh_path, out_dir, page))
                registry[en_path] = page
                if zh_path:
                    registry[zh_path] = page

    walk(en_root / "index.rst", zh_root / "index.rst", "twinkle")
    return pairs, registry


def rewrite_links(text: str, src: Path, page: str, registry: dict) -> str:
    def repl(m):
        label, target = m.group(1), m.group(2)
        decoded = unquote(target)
        if decoded.startswith(("http://", "https://", "mailto:", "#", "/")):
            return m.group(0)
        path, _, anchor = decoded.partition("#")
        if not path.endswith(".md"):
            return m.group(0)
        resolved = (src.parent / path).resolve()
        dest = registry.get(resolved)
        suffix = f"#{anchor}" if anchor else ""
        if dest:
            rel = posixpath.relpath(dest, page)
            return f"[{label}]({rel}/{suffix})"
        # Unsynced target: point at the source file on GitHub instead of a dead link.
        return f"[{label}](https://github.com/modelscope/twinkle/blob/main/docs/{path})"

    return re.sub(r"\[([^\]]*)\]\(([^)]+)\)", repl, text)


def import_twinkle(twinkle: Path, commit: str):
    en_root, zh_root = twinkle / "docs" / "source_en", twinkle / "docs" / "source_zh"
    pairs, registry = build_pairs(en_root, zh_root)
    warnings, count = [], 0
    folders = {}
    for en_path, zh_path, out_dir, page in pairs:
        for src, suffix in ((en_path, ""), (zh_path, ".zh")):
            if src is None or not src.exists():
                if suffix == "":
                    fail(f"twinkle EN doc missing: {en_path}")
                continue
            body = src.read_text()
            title, desc, body = split_frontmatter(body)
            body = rewrite_links(body, src, page, registry)
            body = mdx_escape(body, warnings, str(src))
            rel_src = src.relative_to(twinkle)
            fm = ["---", f"title: {yaml_str(title or src.stem)}"]
            if desc:
                fm.append(f"description: {yaml_str(desc)}")
            fm.append(f"editUrl: https://github.com/modelscope/twinkle/blob/{commit}/{rel_src}")
            fm.append("---")
            dest = DOCS_OUT / (page + suffix + ".mdx")
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text("\n".join(fm) + "\n\n" + body)
            count += 1
        folders.setdefault(out_dir, []).append(posixpath.basename(page))

    # Folder ordering + bilingual folder landing pages from toctree captions.
    for folder, pages in folders.items():
        meta = {"pages": pages}
        (DOCS_OUT / folder / "meta.json").write_text(json.dumps(meta, indent=2))
    write_folder_indexes(en_root, zh_root, "twinkle")
    for w in warnings:
        print(f"[prepare-content] WARN {w}")
    print(f"[prepare-content] twinkle docs: {count} files, {len(warnings)} warnings")


def write_folder_indexes(en_root: Path, zh_root: Path, out_prefix: str):
    """Give every folder a bilingual index page so sidebar labels localize."""

    def walk(en_rst: Path, zh_rst: Path, out_dir: str):
        en_blocks = parse_toctrees(en_rst)
        zh_blocks = parse_toctrees(zh_rst)
        for bi, (en_cap, en_entries) in enumerate(en_blocks):
            zh_cap = zh_blocks[bi][0] if bi < len(zh_blocks) else ""
            if out_dir:
                for cap, suffix in ((en_cap or en_rst.parent.name, ""), (zh_cap or en_cap, ".zh")):
                    dest = DOCS_OUT / out_dir / f"index{suffix}.mdx"
                    if not dest.exists():
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_text(f"---\ntitle: {yaml_str(cap)}\n---\n")
            for entry in en_entries:
                if entry.endswith(".rst"):
                    en_path = (en_rst.parent / entry).resolve()
                    zh_path = (zh_rst.parent / entry).resolve()
                    sub = slugify(en_path.parent.name) if en_path.name == "index.rst" else slugify(en_path.stem)
                    walk(en_path, zh_path if zh_path.exists() else en_path, f"{out_dir}/{sub}" if out_dir else sub)

    walk(en_root / "index.rst", zh_root / "index.rst", out_prefix)


# ---------------------------------------------------------------------------
# News / site data / assets / perf
# ---------------------------------------------------------------------------


def extract_news(swift: Path):
    news = {}
    for lang, readme, heading in (("en", "README.md", r"##\s+.*News"), ("zh", "README_CN.md", r"##\s+.*新闻")):
        text = (swift / readme).read_text()
        m = re.search(heading, text)
        if not m:
            fail(f"News heading not found in {readme}")
        for line in text[m.end() :].splitlines():
            s = line.strip()
            if s.startswith("- "):
                dm = re.match(r"-\s*[🔥🎁🎉]*\s*([\d.]+):\s*(.+)", s)
                if dm:
                    news[lang] = {
                        "date": dm.group(1),
                        "markdown": dm.group(2),
                        "source": f"https://github.com/modelscope/ms-swift/blob/main/{readme}",
                    }
                break
            if s.startswith("#"):
                break
    if len(news) != 2:
        fail(f"could not extract news for both languages: {list(news)}")
    (WEB_ROOT / "content" / "news.json").write_text(json.dumps(news, ensure_ascii=False, indent=2))
    print(f"[prepare-content] news: en={news['en']['date']} zh={news['zh']['date']}")


def site_data(swift: Path, roots):
    count = 0
    for py in (swift / "swift" / "dev" / "model" / "loader").glob("*.py"):
        count += len(re.findall(r"^@register_model\b", py.read_text(), re.M))
    data = {"modelLoaderCount": count, "commits": {name: git_head(root) for name, root in roots.items()}}
    (WEB_ROOT / "content" / "site-data.json").write_text(json.dumps(data, indent=2))
    print(f"[prepare-content] site-data: {count} registered model loaders")


def copy_assets(swift: Path):
    dest = WEB_ROOT / "public" / "images"
    dest.mkdir(parents=True, exist_ok=True)
    for name in ("wechat.png", "discord_qr.jpg", "banner.png"):
        src = swift / "asset" / name
        if not src.exists():
            fail(f"asset missing: {src}")
        shutil.copy2(src, dest / name)
    mark = swift / "web-ui-v5" / "webui" / "public" / "swift-logo.png"
    if mark.exists():
        shutil.copy2(mark, dest / "swift-mark.png")
    else:
        print("[prepare-content] WARN swift-logo.png not found; nav mark falls back to banner")
        shutil.copy2(swift / "asset" / "banner.png", dest / "swift-mark.png")
    for shot in ("web-ui.jpg", "web-ui-en.jpg"):
        src = swift / "docs" / "resources" / shot
        if src.exists():
            shutil.copy2(src, dest / shot)
    print("[prepare-content] assets copied")


PERF_REQUIRED = ("model", "task", "mode", "step_wall_clock_s", "tokens_per_s", "source_log")


def prepare_perf(regression: Path):
    results = regression / "perf_bench_20261124" / "results"
    out = {"status": "pending"}
    table = results / "speed_table.json"
    if table.exists():
        data = json.loads(table.read_text())
        rows = data.get("rows")
        if not isinstance(rows, list) or not rows:
            fail("speed_table.json exists but has no rows; refusing to publish")
        for row in rows:
            missing = [k for k in PERF_REQUIRED if k not in row]
            if missing:
                fail(f"speed_table.json row missing {missing}; refusing to publish")
            if row["mode"] not in ("v4", "v5-ray", "v5-remote"):
                fail(f"unknown mode {row['mode']}; only v4/v5-ray/v5-remote allowed")
        out = {"status": "ready", "table": data}
        for extra in ("curve_data.json", "regression_verdict.json"):
            p = results / extra
            if p.exists():
                out[extra.split(".")[0]] = json.loads(p.read_text())
    (WEB_ROOT / "content" / "perf.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"[prepare-content] perf: {out['status']}")


def main():
    roots, _ = resolve_sources()
    if DOCS_OUT.exists():
        shutil.rmtree(DOCS_OUT)
    DOCS_OUT.mkdir(parents=True)
    copy_swift_v5(roots["swift"], git_head(roots["swift"]))
    import_twinkle(roots["twinkle"], git_head(roots["twinkle"]))
    extract_news(roots["swift"])
    site_data(roots["swift"], roots)
    copy_assets(roots["swift"])
    prepare_perf(roots["regression"])
    print("[prepare-content] done")


if __name__ == "__main__":
    main()
