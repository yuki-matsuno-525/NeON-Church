"""正規化スキーマに対する共通バリデーション（DB 非依存）。

どの書でも同じチェックを当てられる。問題は (レベル, メッセージ) のリストで返す。
レベル: "error" = ほぼ取り込み NG / "warn" = 要目視確認 / "info" = 参考。
"""

from __future__ import annotations

import re

# 校訂記号の開き/閉じペア（バランスを確認する）
_BRACKET_PAIRS = [("〚", "〛"), ("⌜", "⌝"), ("[", "]")]
# 残ってはいけない HTML の痕跡
_HTML_LEFTOVER = re.compile(r"<[a-zA-Z/][^>]*>|&[a-z]+;|&#\d+;")
# ページ番号の取りこぼし疑い: 本文中に孤立した1〜3桁の数字（前後が空白）
_STRAY_NUMBER = re.compile(r"(?:^|\s)\d{1,3}(?:\s|$)")


def _check_sequence(numbers: list[int], label: str) -> list[tuple[str, str]]:
    """番号が 1..N の連番かを調べ、重複・欠番・1始まりでない点を報告する。"""
    issues: list[tuple[str, str]] = []
    if not numbers:
        return [("error", f"{label}: 要素がありません")]

    seen = set()
    dups = sorted({n for n in numbers if n in seen or seen.add(n)})
    if dups:
        issues.append(("error", f"{label}: 番号の重複 {dups}"))

    uniq = sorted(set(numbers))
    if uniq[0] != 1:
        issues.append(("warn", f"{label}: 1 から始まっていません（先頭 {uniq[0]}）"))
    gaps = [n for n in range(uniq[0], uniq[-1] + 1) if n not in seen]
    if gaps:
        issues.append(("warn", f"{label}: 欠番 {gaps}"))
    return issues


def validate(data: dict, expect_chapters: int | None = None) -> list[tuple[str, str]]:
    """正規化データを検査して問題リストを返す。"""
    issues: list[tuple[str, str]] = []
    chapters = data.get("chapters", [])

    # 章番号の連番性
    chap_nums = [c["number"] for c in chapters]
    issues += _check_sequence(chap_nums, "章")
    if expect_chapters is not None and chap_nums:
        if max(chap_nums) != expect_chapters:
            issues.append(
                ("warn", f"章数が想定と違います: 最大 {max(chap_nums)} / 期待 {expect_chapters}")
            )

    # 校訂記号のバランス（全文まとめて）
    all_text = "\n".join(v["text"] for c in chapters for v in c["verses"])
    for open_ch, close_ch in _BRACKET_PAIRS:
        no, nc = all_text.count(open_ch), all_text.count(close_ch)
        if no != nc:
            issues.append(
                ("warn", f"校訂記号 {open_ch}{close_ch} の数が不一致: 開 {no} / 閉 {nc}")
            )

    # 章ごとの節チェック
    for c in chapters:
        clabel = f"第{c['number']}章"
        verse_nums = [v["number"] for v in c["verses"]]
        issues += _check_sequence(verse_nums, f"{clabel} の節")

        for v in c["verses"]:
            vlabel = f"{c['number']}:{v['number']}"
            text = v["text"]
            if not text.strip():
                issues.append(("error", f"{vlabel}: 本文が空です"))
                continue
            if _HTML_LEFTOVER.search(text):
                issues.append(("warn", f"{vlabel}: HTML タグ/実体参照が残っています"))
            strays = _STRAY_NUMBER.findall(text)
            if strays:
                issues.append(
                    ("info", f"{vlabel}: 孤立した数字あり（ページ番号の取りこぼし疑い）: {[s.strip() for s in strays]}")
                )

    return issues


def summarize(issues: list[tuple[str, str]]) -> dict[str, int]:
    """レベルごとの件数を返す。"""
    counts = {"error": 0, "warn": 0, "info": 0}
    for level, _ in issues:
        counts[level] = counts.get(level, 0) + 1
    return counts
