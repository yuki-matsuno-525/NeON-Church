"""収集スクリプト共通の小道具。

collectors/ の中身はローカルで一度だけ流して seed を作るためのもの。本番では使わない
（本番は seed を import_commentary で入れるだけ）。
"""

from __future__ import annotations

import gzip
import json
import re
from pathlib import Path

from commentary.refs import Ref

SEED_DIR = Path(__file__).resolve().parents[1] / "seed"


def link(ref: Ref, method: str, confidence: float | None = None) -> dict:
    """Ref を seed の links の1件にする。"""
    return {**ref.as_dict(), "method": method, "confidence": confidence}


def dedupe_links(links: list[dict]) -> list[dict]:
    """同じ区切りの中の同じ箇所・同じ方法は1件にまとめる（順番は保つ）。"""
    seen: set[tuple] = set()
    out = []
    for item in links:
        key = (item["book"], item["chapter"], item["verse"], item["chapter_end"], item["verse_end"], item["method"])
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def clean_text(text: str) -> str:
    """連続する空白を1つにし、前後の空白を落とす。段落の区切り（空行）は残す。"""
    paragraphs = [re.sub(r"[ \t\r\f\v ]+", " ", p).strip() for p in re.split(r"\n\s*\n", text)]
    paragraphs = [re.sub(r"\s*\n\s*", " ", p) for p in paragraphs]
    return "\n\n".join(p for p in paragraphs if p)


def write_seed(data: dict, seed_dir: Path = SEED_DIR) -> Path:
    """1冊ぶんを commentary/seed/<slug>.json.gz に書く。

    gzip の中の時刻を 0 に固定し、同じ中身なら同じファイルになるようにする（git の差分が出ない）。
    """
    seed_dir.mkdir(parents=True, exist_ok=True)
    path = seed_dir / f"{data['slug']}.json.gz"
    raw = json.dumps(data, ensure_ascii=False, indent=0).encode("utf-8")
    path.write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
    return path


def summarize(data: dict) -> str:
    """件数の要約（収集結果の確認用）。"""
    links = [lk for s in data["sections"] for lk in s.get("links", [])]
    by_method: dict[str, int] = {}
    for lk in links:
        by_method[lk["method"]] = by_method.get(lk["method"], 0) + 1
    chars = sum(len(s["text"]) for s in data["sections"])
    return f"{data['slug']}: 区切り {len(data['sections'])} / 箇所 {len(links)} {by_method} / {chars // 1000}k 字"
