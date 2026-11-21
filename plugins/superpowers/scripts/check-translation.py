#!/usr/bin/env python3
"""superpowers 日本語版の検査スクリプト（Python 標準ライブラリのみ）。

使い方:
  python3 -I check-translation.py --upstream DIR [--skill NAME ...] [--structure-only]

終了コード 0 = 全検査合格、1 = 不合格（不合格項目をファイル単位で出力）。
"""
import argparse
import re
import sys
from collections import Counter
from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent

# upstream のコピー対象（skills/ 以外）
EXTRA_FILES = [
    "hooks/hooks.json",
    "hooks/run-hook.cmd",
    "hooks/session-start",
    ".claude-plugin/plugin.json",
    ".devin-plugin/plugin.json",
    "LICENSE",
]
# 存在してよい追加ファイル
ALLOWED_EXTRA = {"scripts/check-translation.py", "UPSTREAM.md", "README.md"}
# バイト一致検査から除外する非 md ファイル
BYTE_EXEMPT = {
    "hooks/session-start",
    ".claude-plugin/plugin.json",
    ".devin-plugin/plugin.json",
}
# 原文のまま保持する 6 ファイル
VERBATIM = [
    f"skills/using-superpowers/references/{n}-tools.md"
    for n in ("codex", "gemini", "pi", "antigravity", "hermes", "muse")
]

KANA = re.compile(r"[぀-ゟ゠-ヿ]")
FORBIDDEN = re.compile(r"効く|効か|効い|効け")

RE_SKILL_REF = re.compile(r"superpowers:[a-z-]+")
RE_URL = re.compile(r"https?://\S+")
RE_TAG = re.compile(r"<[A-Z][A-Z_-]+>")
RE_PLACEHOLDER = re.compile(r"\[[A-Z][A-Z0-9_ ]*\]")
RE_STATUS = re.compile(r"\b(?:DONE_WITH_CONCERNS|DONE|BLOCKED|NEEDS_CONTEXT|ADDRESSED)\b")
RE_FENCE = re.compile(r"^```", re.M)
RE_TASK_HEADING = re.compile(r"^#+\s+Task\s", re.M)
RE_LINK = re.compile(r"\]\(([^)\s]+)\)")


def upstream_files(up: Path):
    files = set()
    for p in (up / "skills").rglob("*"):
        if p.is_file():
            files.add(p.relative_to(up).as_posix())
    files.update(EXTRA_FILES)
    return files


def plugin_files():
    return {p.relative_to(PLUGIN).as_posix() for p in PLUGIN.rglob("*") if p.is_file()}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def preserved_items(text: str):
    """保持検査の対象を {名前: Counter} で返す。"""
    urls = [u.rstrip(")>.,") for u in RE_URL.findall(text)]
    return {
        "superpowers 参照": Counter(RE_SKILL_REF.findall(text)),
        "URL": Counter(urls),
        "タグ": Counter(RE_TAG.findall(text)),
        "プレースホルダ": Counter(RE_PLACEHOLDER.findall(text)),
        "ステータス語": Counter(RE_STATUS.findall(text)),
        "コードフェンス行数": Counter({"fence": len(RE_FENCE.findall(text))}),
        "Task 見出し数": Counter({"task": len(RE_TASK_HEADING.findall(text))}),
    }


def diff_counter(name, up: Counter, tr: Counter):
    msgs = []
    missing = up - tr
    extra = tr - up
    if name in ("コードフェンス行数", "Task 見出し数"):
        (k,) = up.keys()
        if up[k] != tr[k]:
            msgs.append(f"{name}: upstream={up[k]} 翻訳={tr[k]}")
        return msgs
    if missing:
        msgs.append(f"{name} 欠落: {sorted(missing.elements())}")
    if extra:
        msgs.append(f"{name} 余分: {sorted(extra.elements())}")
    return msgs


def parse_frontmatter(text: str):
    m = re.match(r"---\r?\n(.*?)\r?\n---", text, re.S)
    if not m:
        return None
    fm = {}
    key = None
    for line in m.group(1).splitlines():
        km = re.match(r"([A-Za-z_-]+):\s*(.*)$", line)
        if km:
            key = km.group(1)
            fm[key] = km.group(2).strip().strip("\"'")
        elif key and line.strip():
            fm[key] += " " + line.strip()
    return fm


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--upstream", required=True)
    ap.add_argument("--skill", action="append", default=[])
    ap.add_argument("--structure-only", action="store_true")
    args = ap.parse_args()

    up = Path(args.upstream)
    failures = []  # (検査名, ファイル, メッセージ)

    def fail(check, path, msg):
        failures.append((check, path, msg))

    # 1. ファイル構成
    expected = upstream_files(up)
    actual = plugin_files()
    for f in sorted(expected - actual):
        fail("1 ファイル構成", f, "欠落")
    for f in sorted(actual - expected - ALLOWED_EXTRA):
        fail("1 ファイル構成", f, "余分")

    common = sorted(expected & actual)

    # 2. 非 md ファイルのバイト一致
    for f in common:
        if f.endswith(".md") or f in BYTE_EXEMPT:
            continue
        if (PLUGIN / f).read_bytes() != (up / f).read_bytes():
            fail("2 非 md バイト一致", f, "upstream と不一致")

    # 3. 保持検査
    md_files = [f for f in common if f.endswith(".md")]
    for f in md_files:
        u = preserved_items(read(up / f))
        t = preserved_items(read(PLUGIN / f))
        for name in u:
            for msg in diff_counter(name, u[name], t[name]):
                fail("3 保持検査", f, msg)

    # 4. 参照解決
    skills_dir = PLUGIN / "skills"
    all_md = sorted(p for p in PLUGIN.rglob("*.md"))
    for p in all_md:
        rel = p.relative_to(PLUGIN).as_posix()
        text = read(p)
        for x in sorted(set(RE_SKILL_REF.findall(text))):
            if not (skills_dir / x.split(":", 1)[1]).is_dir():
                fail("4 参照解決", rel, f"{x} に対応する skills/ ディレクトリがない")
        # コードブロック内のリンクは例示（upstream にも実在しない例がある）なので除外
        prose = re.sub(r"^```.*?^```", "", text, flags=re.M | re.S)
        for link in RE_LINK.findall(prose):
            if re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", link) or link.startswith("#"):
                continue
            target = link.split("#", 1)[0].split("?", 1)[0]
            if not target:
                continue
            if not (p.parent / target).is_file():
                fail("4 参照解決", rel, f"リンク先が存在しない: {link}")
    for sk in sorted(skills_dir.glob("*/SKILL.md")):
        rel = sk.relative_to(PLUGIN).as_posix()
        fm = parse_frontmatter(read(sk))
        if fm is None:
            fail("4 参照解決", rel, "frontmatter がない")
            continue
        if not fm.get("name"):
            fail("4 参照解決", rel, "frontmatter に name がない")
        elif fm["name"] != sk.parent.name:
            fail("4 参照解決", rel, f"name '{fm['name']}' がディレクトリ名と不一致")
        if not fm.get("description"):
            fail("4 参照解決", rel, "description が空")

    if not args.structure_only:
        # 5, 6 の対象スキル
        all_skills = sorted(p.name for p in skills_dir.iterdir() if p.is_dir())
        targets = args.skill or all_skills
        for s in targets:
            if s not in all_skills:
                fail("5 翻訳済み", f"skills/{s}", "スキルが存在しない")
        for s in targets:
            if s not in all_skills:
                continue
            for p in sorted((skills_dir / s).rglob("*.md")):
                rel = p.relative_to(PLUGIN).as_posix()
                text = read(p)
                if rel in VERBATIM:
                    if p.read_bytes() != (up / rel).read_bytes():
                        fail("5 翻訳済み", rel, "原文維持ファイルが upstream と不一致")
                else:
                    if not KANA.search(text):
                        fail("5 翻訳済み", rel, "未翻訳（ひらがな・カタカナなし）")
                    if p.name == "SKILL.md":
                        fm = parse_frontmatter(text) or {}
                        if not KANA.search(fm.get("description", "")):
                            fail("5 翻訳済み", rel, "description が未翻訳")
                for m in FORBIDDEN.finditer(text):
                    line = text.count("\n", 0, m.start()) + 1
                    fail("6 禁止表現", rel, f"{line} 行目: 「{m.group(0)}」")

    if failures:
        cur = None
        for check, path, msg in failures:
            if check != cur:
                print(f"[不合格] {check}")
                cur = check
            print(f"  {path}: {msg}")
        print(f"不合格 {len(failures)} 件")
        return 1
    print("全検査合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
