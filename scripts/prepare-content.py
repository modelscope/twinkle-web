#!/usr/bin/env python3
"""Prepare static site content from locked source repositories.

Outputs (all regenerated on every run, never hand-edited):
  content/docs/5.0.0.dev/**   released SWIFT v5 docs (from ms-swift docs/v5/source_{zh,en})
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


def source_dirty(repo, name):
    paths = {
        "swift": ["docs/v5", "asset", "swift/dev/model/loader", "README.md", "README_CN.md"],
        "twinkle": ["docs"],
        "regression": ["perf_bench_20261124", "PERF_BENCH_20261124.md"],
    }[name]
    return bool(subprocess.run(
        ["git", "-C", str(repo), "status", "--porcelain", "--untracked-files=all", "--", *paths],
        capture_output=True, text=True, check=True,
    ).stdout.strip())


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
        dirty = source_dirty(root, name)
        if dirty and not ALLOW_DIRTY:
            fail(f"{name} has uncommitted content; ALLOW_DIRTY_SOURCES=1 is for local iteration only")
        roots[name] = root
        label = " (local working tree)" if dirty or head != spec["commit"] else " (locked baseline)"
        print(f"[prepare-content] {name}: {root} @ {head[:9]}{label}")
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


def copy_swift_v5(swift: Path, commit: str, pages):
    pairs = [(swift / "docs/v5/source_en", ""), (swift / "docs/v5/source_zh", ".zh")]
    count = 0
    for src_root, suffix in pairs:
        for page in pages:
            rel = Path(page + ".mdx")
            src = src_root / rel
            if not src.is_file():
                fail(f"release page missing: {src}")
            dest = DOCS_OUT / rel.with_name(rel.stem + suffix + ".mdx")
            dest.parent.mkdir(parents=True, exist_ok=True)
            text = src.read_text()
            if "editUrl:" not in text:
                url = f"https://github.com/modelscope/ms-swift/blob/{commit}/{src.relative_to(swift)}"
                text = re.sub(r"^---\n", f"---\neditUrl: {url}\n", text, count=1)
            dest.write_text(text)
            count += 1
    # 中英共用排序，只从英文源复制已发布目录的 metadata。
    for folder in sorted({Path(page).parent for page in pages}):
        src = swift / "docs/v5/source_en" / folder / "meta.json"
        if not src.is_file():
            fail(f"release metadata missing: {src}")
        shutil.copy2(src, DOCS_OUT / folder / "meta.json")
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
    diagrams = dest / "v5"
    diagrams.mkdir(parents=True, exist_ok=True)
    for topic in ("mp-separation", "server-client"):
        for lang in ("en", "zh"):
            name = f"{topic}.{lang}.svg"
            src = swift / "docs/v5/assets" / name
            if not src.is_file():
                fail(f"architecture diagram missing: {src}")
            shutil.copy2(src, diagrams / name)
    print("[prepare-content] assets copied")


# 每条曲线固定到已完成的运行；不混入 ga8 或 premerge 对照。
PERF_CHAINS = {
    ("Qwen3.5-4B", "sft"): {
        "v4": "B4_sft_v4_full.metrics.jsonl", "v5-ray": "B4_sft_v5_ray_full.metrics.jsonl",
        "v5-remote": "B4_sft_v5_remote_ga16.metrics.jsonl",
    },
    ("Qwen3.5-35B-A3B", "sft"): {
        "v4": "B35_sft_v4.metrics.jsonl", "v5-ray": "B35_sft_v5_ray.metrics.jsonl",
        "v5-remote": "B35_sft_v5_remote.metrics.jsonl",
    },
    ("Qwen3.5-4B", "grpo"): {
        "v4": "B4_grpo_v4_colocate.metrics.jsonl", "v5-ray": "B4_grpo_v5_ray.metrics.jsonl",
        "v5-remote": "B4_grpo_v5_remote.metrics.jsonl",
    },
    ("Qwen3.5-35B-A3B", "grpo"): {
        "v4": "B35_grpo_v4_colocate.metrics.jsonl", "v5-ray": "B35_grpo_v5_ray.metrics.jsonl",
        "v5-remote": "B35_grpo_v5_remote.metrics.jsonl",
    },
    ("Qwen3.5-35B-A3B", "router_replay_R2"): {"v5-ray": "B35_router_replay_v5_ray.metrics.jsonl"},
    ("Qwen3.5-35B-A3B", "router_replay_R3"): {"v5-remote": "B35_router_replay_v5_remote_R3.metrics.jsonl"},
    ("autotrust/JEV-9B", "decision"): {
        "v4": "JEV_decision_v4.logging.jsonl", "v5-ray": "JEV_decision_v5_ray.metrics.jsonl",
        "v5-remote": "JEV_decision_v5_remote.metrics.jsonl",
    },
}


class PerfSnapshot:
    """将实验仓的现有表格、分任务 JSON 和逐步记录整理为站点数据。"""

    def __init__(self, regression):
        self.root = regression
        self.batch = regression / "perf_bench_20261124"
        self.results = self.batch / "results"
        self.commit = git_head(regression)

    def source(self, path):
        return f"https://github.com/tastelikefeet/swift5-regression-exps/blob/{self.commit}/{path.relative_to(self.root)}"

    def read_json(self, name):
        return json.loads((self.results / name).read_text())

    @staticmethod
    def number(text):
        match = re.search(r"[0-9]+(?:\.[0-9]+)?", text)
        return float(match.group()) if match else None

    def speed_rows(self):
        path = self.results / "speed_table.md"
        sections = {
            "4B-sft": ("Qwen3.5-4B", "sft"), "35B-A3B-sft": ("Qwen3.5-35B-A3B", "sft"),
            "4B-grpo": ("Qwen3.5-4B", "grpo"), "35B-A3B-grpo": ("Qwen3.5-35B-A3B", "grpo"),
            "35B-A3B-router_replay": ("Qwen3.5-35B-A3B", "router_replay"),
            "JEV-decision": ("autotrust/JEV-9B", "decision"),
        }
        rows = []
        for block in re.split(r"(?m)^## ", path.read_text())[1:]:
            heading, _, body = block.partition("\n")
            key = next((v for prefix, v in sections.items() if heading.startswith(prefix + "（")), None)
            if key is None:
                continue
            model, task = key
            for line in body.splitlines():
                if not line.startswith("| v"):
                    continue
                cells = [c.strip().replace("**", "") for c in line.strip().strip("|").split("|")]
                mode = next((m for m in ("v5-remote", "v5-ray", "v4") if cells[0].startswith(m)), None)
                if mode is None or len(cells) < 3:
                    fail(f"invalid performance table row: {line}")
                row_task = task
                timing = "steady_step" if task == "sft" else "recorded_step"
                if task == "grpo":
                    timing = "full_cycle_mean" if mode == "v4" else (
                        "trainer_compute" if model == "Qwen3.5-4B" else "recorded_step")
                if task == "router_replay":
                    row_task += "_R3" if mode == "v5-remote" else "_R2"
                    timing = "server_compute" if mode == "v5-remote" else "recorded_step"
                step, wall = self.number(cells[1]), None
                if task == "decision":
                    timing = "full_cycle_mean" if mode == "v4" else "steady_step"
                    if mode == "v5-remote":
                        step, wall, timing = None, self.number(cells[1]), "total_only"
                if task == "sft":
                    wall = self.number(cells[2])
                runtime_match = re.search(r"runtime\s*([0-9.]+)", cells[1])
                if runtime_match:
                    wall = float(runtime_match.group(1))
                std_match = re.search(r"±\s*([0-9.]+)", cells[1])
                rows.append({
                    "model": model, "task": row_task, "mode": mode,
                    "step_wall_clock_s": step, "tokens_per_s": None, "wall_time_s": wall,
                    "std_s": float(std_match.group(1)) if std_match else None,
                    "timing": timing, "timing_note": " · ".join(cells[1:]),
                    "source_log": self.source(path), "config": heading,
                    "window": "steps 6–30" if task == "sft" else "source-specific window",
                })
        speed = self.read_json("speed_4B_sft.json")
        remote = self.read_json("curve_data/B35_grpo_v5_remote_summary.json")
        for row in rows:
            if row["model"] == "Qwen3.5-4B" and row["task"] == "sft" and row["mode"] != "v5-remote":
                prefix = "v4" if row["mode"] == "v4" else "v5_ray"
                row["step_wall_clock_s"] = speed[f"{prefix}_steady_s_it"]
                row["std_s"] = speed[f"{prefix}_steady_std"]
                if row["mode"] == "v5-ray":
                    row["tokens_per_s"] = speed["v5_tokens_per_s"]
            if (row["model"], row["task"], row["mode"]) == ("Qwen3.5-35B-A3B", "grpo", "v5-remote"):
                row.update(step_wall_clock_s=remote["steady_s_per_it_mean"], std_s=remote["steady_s_per_it_std"],
                           first_step_s=remote["step1_elapse_s"], elapsed_s=remote["total_elapse_s"],
                           source_log=self.source(self.results / "curve_data/B35_grpo_v5_remote_summary.json"))
            if row["task"] == "grpo" and row["model"] == "Qwen3.5-4B" and row["mode"] == "v5-remote":
                # 表格计时不绑定到最新奖励重跑；只展示来源，不推断最新运行时延。
                row["timing_note"] += " · timing record differs from the latest reward rerun"
        if not rows:
            fail("completed speed_table.md contains no recognized rows")
        return rows

    def curve_records(self):
        import math

        curves, stability = [], []
        for (model, task), chains in PERF_CHAINS.items():
            metrics = {m: [] for m in ("loss", "reward", "grad_norm", "approx_kl", "ratio_oob_low")}
            for mode, filename in chains.items():
                path = self.results / "curve_data" / filename
                records = {}
                for line in path.read_text().splitlines():
                    if not line.strip():
                        continue
                    record = json.loads(line)
                    if "train_runtime" in record or "log_history" in record:
                        continue
                    # 归档中同时有精简行和原始 trainer 行，统一明确的指标别名。
                    for metric, source in (("reward", "train/total_reward"),
                                           ("approx_kl", "train/approx_kl"),
                                           ("ratio_oob_low", "train/ratio_oob_low")):
                        if metric not in record and source in record:
                            record[metric] = record[source]
                    step = record.get("step")
                    if step is None and "global_step/max_steps" in record:
                        step = int(record["global_step/max_steps"].split("/")[0])
                    if step is None:
                        continue  # 汇总行不是额外更新。
                    if isinstance(step, bool) or not isinstance(step, (int, float)) or not math.isfinite(step) or step <= 0:
                        fail(f"invalid optimizer step in {path}")
                    if step in records:
                        fail(f"duplicate optimizer step {step} in {path}")
                    records[step] = record
                if not records:
                    fail(f"empty performance curve: {path}")
                summary = {"model": model, "task": task, "mode": mode, "steps": len(records),
                           "source": self.source(path)}
                for metric in metrics:
                    points = []
                    for step, record in sorted(records.items()):
                        value = record.get(metric)
                        if value is None:
                            continue
                        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                            fail(f"non-finite {metric} at step {step} in {path}")
                        points.append([step, value])
                    if points:
                        metrics[metric].append({"mode": mode, "points": points, "source": self.source(path)})
                        summary[metric] = {"first": points[0][1], "last": points[-1][1],
                                           "min": min(p[1] for p in points), "max": max(p[1] for p in points)}
                        if metric == "reward":
                            summary[metric].update(early_mean=sum(p[1] for p in points[:5]) / len(points[:5]),
                                                   late_mean=sum(p[1] for p in points[-5:]) / len(points[-5:]))
                stability.append(summary)
            curves.extend({"model": model, "task": task, "metric": metric, "series": series}
                          for metric, series in metrics.items() if series)
        return curves, stability

    def verdicts(self):
        import math

        pairs = []
        verdict_file = self.results / "regression_verdict.md"
        b4_section = next((block for block in re.split(r"(?m)^## ", verdict_file.read_text())[1:]
                           if block.startswith("4B-sft（")), None)
        if b4_section is None:
            fail("missing 4B SFT verdict section")

        def table_verdict(label):
            matches = []
            for line in b4_section.splitlines():
                if not line.startswith("|"):
                    continue
                cells = [c.strip().replace("**", "") for c in line.strip().strip("|").split("|")]
                if cells[0] == label:
                    matches.append(cells)
            if len(matches) != 1 or len(matches[0]) != 6:
                fail(f"missing or ambiguous SFT verdict: {label}")
            cells = matches[0]
            verdict = re.match(r"^(PASS|FAIL)(?:\b|（)", cells[5])
            endpoint = self.number(cells[4])
            if verdict is None or endpoint is None:
                fail(f"incomplete SFT verdict: {label}")
            return endpoint, verdict.group(1)

        def add(model, a, b, median, endpoint, name, verdict, verdict_source=None):
            if verdict not in ("PASS", "FAIL"):
                fail(f"missing completed SFT verdict in {name}")
            for value in (median, endpoint):
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                    fail(f"invalid SFT deviation in {name}")
            source = self.source(self.results / "curve_data" / name)
            pairs.append({"model": model, "task": "sft", "a": a, "b": b,
                          "median_rel_dev": median / 100, "endpoint_rel_dev": endpoint / 100,
                          "verdict": verdict, "source": source, "verdict_source": verdict_source or source})

        b4 = self.read_json("curve_data/B4_sft_full_deviation.json")
        _, verdict = table_verdict("v4 vs v5-ray")
        add("Qwen3.5-4B", "v4", "v5-ray", b4["median_rel_dev_pct"], b4["endpoint_rel_diff_pct"],
            "B4_sft_full_deviation.json", verdict, self.source(verdict_file))
        align = self.read_json("curve_data/B4_sft_remote_ga16_align.json")
        # 终点百分比和判词采用原记录定义，不在站点重新选择 denominator 或推断 PASS。
        for mode, prefix in (("v4", "v4"), ("v5-ray", "ray")):
            deviation, verdict = table_verdict(f"{mode} vs v5-remote(ga16)")
            add("Qwen3.5-4B", mode, "v5-remote", align[f"{prefix}_vs_ga16_median_pct"], deviation,
                "B4_sft_remote_ga16_align.json", verdict, self.source(verdict_file))
            pairs[-1]["endpoint_source"] = self.source(verdict_file)
        b35 = self.read_json("curve_data/B35_sft_v4_vs_v5ray_deviation.json")
        add("Qwen3.5-35B-A3B", "v4", "v5-ray", b35["median_dev_pct"], b35["endpoint_dev_pct"],
            "B35_sft_v4_vs_v5ray_deviation.json", b35.get("verdict"))
        remote = self.read_json("curve_data/B35_sft_v5_remote_deviation.json")
        for mode, key in (("v4", "remote_vs_v4"), ("v5-ray", "remote_vs_v5ray")):
            stats = remote[key]
            add("Qwen3.5-35B-A3B", mode, "v5-remote", stats["median"], stats["endpoint"],
                "B35_sft_v5_remote_deviation.json", remote.get("verdict"))
        return pairs

    def build(self):
        rows = self.speed_rows()
        curves, stability = self.curve_records()
        lock = json.loads((self.batch / "version_lock.json").read_text())
        return {
            "status": "ready", "table": {"rows": rows, "commit": self.commit},
            "curve_data": {"curves": curves}, "stability": stability,
            "regression_verdict": {"pairs": self.verdicts()},
            "self_control": self.read_json("curve_data/B4_sft_v5_self_control.json"),
            "protocol": {"gpu": lock["gpu"], "baseline_commits": {
                name: lock[name] for name in ("ms_swift", "twinkle", "mcore_bridge")},
                "sources": [self.source(self.root / "PERF_BENCH_20261124.md"),
                            self.source(self.batch / "version_lock.json"),
                            self.source(self.results / "regression_verdict.md")]},
        }


def prepare_perf(regression: Path):
    out = PerfSnapshot(regression).build()
    (WEB_ROOT / "content/perf.json").write_text(json.dumps(out, ensure_ascii=False, indent=2, allow_nan=False))
    print(f"[prepare-content] perf: {out['status']}")


def main():
    roots, manifest = resolve_sources()
    release = manifest["release"]
    if release["version"] != VERSION:
        fail("release version does not match the configured docs version")
    if release["twinkle"]:
        fail("this release publishes authored SWIFT pages, not automatic twinkle reference imports")
    if DOCS_OUT.exists():
        shutil.rmtree(DOCS_OUT)
    DOCS_OUT.mkdir(parents=True)
    copy_swift_v5(roots["swift"], git_head(roots["swift"]), release["docs"])
    extract_news(roots["swift"])
    site_data(roots["swift"], roots)
    copy_assets(roots["swift"])
    prepare_perf(roots["regression"])
    print("[prepare-content] done")


if __name__ == "__main__":
    main()
