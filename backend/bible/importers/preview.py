"""正規化データを目視確認用テキストに変換する共通処理（DB 非依存）。

原文（Project Gutenberg のページ等）と並べて数か所を突き合わせるための出力。
"""

from __future__ import annotations


def render_preview(data: dict) -> str:
    """全章・全節を `章:節  本文` 形式で書き出す。"""
    chapters = data.get("chapters", [])
    total_verses = sum(len(c["verses"]) for c in chapters)

    out: list[str] = []
    out.append("=" * 70)
    out.append(f"  {data.get('book', '?')} ({data.get('translation', '?')})")
    out.append(f"  source: {data.get('source', '?')}")
    out.append(f"  章数: {len(chapters)}  /  節数: {total_verses}")
    out.append("=" * 70)
    out.append("")

    # 章ごとの節数一覧（ざっと俯瞰して極端に少ない/多い章を見つける用）
    out.append("[ 章ごとの節数 ]")
    counts = "  ".join(f"{c['number']}:{len(c['verses'])}" for c in chapters)
    out.append(counts)
    out.append("")

    for c in chapters:
        out.append("-" * 70)
        out.append(f"=== 第{c['number']}章  ({len(c['verses'])} 節) ===")
        for v in c["verses"]:
            # 詩文の改行はインデントして読みやすくする
            text = v["text"].replace("\n", "\n        ")
            out.append(f"{c['number']}:{v['number']}  {text}")
        out.append("")

    return "\n".join(out)
