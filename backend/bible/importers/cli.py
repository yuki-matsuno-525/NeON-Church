"""取り込みパイプラインの CLI（DB 非依存）。

backend ディレクトリで実行する:

    python -m bible.importers.cli parse-enoch <html> -o out.json
    python -m bible.importers.cli parse-mary  <html> -o out.json
    python -m bible.importers.cli validate   out.json [--expect-chapters 108]
    python -m bible.importers.cli preview     out.json -o out.preview.txt
    python -m bible.importers.cli all         <book> <html> [--expect-chapters N]

`all` は parse → validate → preview をまとめて実行し、JSON とプレビューを書き出す。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .enoch import parse_enoch
from .infancy_thomas import parse_infancy_thomas
from .judas import parse_judas
from .life_of_adam_and_eve import parse_life_of_adam_and_eve
from .mary import parse_mary
from .peter import parse_peter
from .preview import render_preview
from .validate import summarize, validate

# `all` / 各 parse コマンドで使う書ごとのパーサと既定の期待章数。
PARSERS = {
    "enoch": (parse_enoch, 108),
    "mary": (parse_mary, 5),
    "infancy-thomas": (parse_infancy_thomas, 19),
    "peter": (parse_peter, 14),
    "judas": (parse_judas, 7),
    "adam-and-eve": (parse_life_of_adam_and_eve, 51),
}


def _load(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _print_issues(issues: list[tuple[str, str]]) -> int:
    counts = summarize(issues)
    for level in ("error", "warn", "info"):
        for lv, msg in issues:
            if lv == level:
                print(f"  [{lv.upper():5}] {msg}")
    print(f"\n  → error {counts['error']} / warn {counts['warn']} / info {counts['info']}")
    return counts["error"]


def _parse_to_json(book: str, html_path: str, output: str) -> tuple[dict, list[str]]:
    parser, _ = PARSERS[book]
    html = Path(html_path).read_text(encoding="utf-8")
    data, warnings = parser(html)
    Path(output).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"JSON を書き出しました: {output}")
    print(f"章数 {len(data['chapters'])} / 節数 {sum(len(c['verses']) for c in data['chapters'])}")
    for w in warnings:
        print(f"  [PARSE] {w}")
    return data, warnings


def cmd_parse_enoch(args) -> int:
    _parse_to_json("enoch", args.html, args.output)
    return 0


def cmd_parse_mary(args) -> int:
    _parse_to_json("mary", args.html, args.output)
    return 0


def cmd_parse_infancy_thomas(args) -> int:
    _parse_to_json("infancy-thomas", args.html, args.output)
    return 0


def cmd_parse_peter(args) -> int:
    _parse_to_json("peter", args.html, args.output)
    return 0


def cmd_parse_judas(args) -> int:
    _parse_to_json("judas", args.html, args.output)
    return 0


def cmd_parse_adam_and_eve(args) -> int:
    _parse_to_json("adam-and-eve", args.html, args.output)
    return 0


def cmd_validate(args) -> int:
    data = _load(args.json)
    issues = validate(data, expect_chapters=args.expect_chapters)
    return 1 if _print_issues(issues) else 0


def cmd_preview(args) -> int:
    data = _load(args.json)
    Path(args.output).write_text(render_preview(data), encoding="utf-8")
    print(f"プレビューを書き出しました: {args.output}")
    return 0


def cmd_all(args) -> int:
    parser, default_chapters = PARSERS[args.book]
    html = Path(args.html).read_text(encoding="utf-8")
    data, warnings = parser(html)

    base = Path(args.outdir)
    base.mkdir(parents=True, exist_ok=True)
    json_path = base / f"{args.book}.json"
    preview_path = base / f"{args.book}.preview.txt"
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    preview_path.write_text(render_preview(data), encoding="utf-8")

    print(f"JSON     : {json_path}")
    print(f"プレビュー: {preview_path}")
    print(f"章数 {len(data['chapters'])} / 節数 {sum(len(c['verses']) for c in data['chapters'])}\n")
    if warnings:
        print("[ パース時の気づき ]")
        for w in warnings:
            print(f"  {w}")
        print()
    print("[ バリデーション ]")
    expect = args.expect_chapters if args.expect_chapters is not None else default_chapters
    issues = validate(data, expect_chapters=expect)
    return 1 if _print_issues(issues) else 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="書籍テキスト取り込みパイプライン（DB 非依存）")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("parse-enoch", help="エノク書 HTML を正規化 JSON に変換")
    p.add_argument("html")
    p.add_argument("-o", "--output", default="enoch.json")
    p.set_defaults(func=cmd_parse_enoch)

    p = sub.add_parser("parse-mary", help="マリアの福音書 HTML を正規化 JSON に変換")
    p.add_argument("html")
    p.add_argument("-o", "--output", default="mary.json")
    p.set_defaults(func=cmd_parse_mary)

    p = sub.add_parser("parse-infancy-thomas", help="トマスによる幼児福音書 HTML を正規化 JSON に変換")
    p.add_argument("html")
    p.add_argument("-o", "--output", default="infancy-thomas.json")
    p.set_defaults(func=cmd_parse_infancy_thomas)

    p = sub.add_parser("parse-peter", help="ペテロの福音書 HTML を正規化 JSON に変換")
    p.add_argument("html")
    p.add_argument("-o", "--output", default="peter.json")
    p.set_defaults(func=cmd_parse_peter)

    p = sub.add_parser("parse-judas", help="ユダの福音書 HTML を正規化 JSON に変換")
    p.add_argument("html")
    p.add_argument("-o", "--output", default="judas.json")
    p.set_defaults(func=cmd_parse_judas)

    p = sub.add_parser("parse-adam-and-eve", help="アダムとエバの生涯 HTML を正規化 JSON に変換")
    p.add_argument("html")
    p.add_argument("-o", "--output", default="adam-and-eve.json")
    p.set_defaults(func=cmd_parse_adam_and_eve)

    p = sub.add_parser("validate", help="正規化 JSON を検査")
    p.add_argument("json")
    p.add_argument("--expect-chapters", type=int, default=None)
    p.set_defaults(func=cmd_validate)

    p = sub.add_parser("preview", help="正規化 JSON をプレビューテキストに変換")
    p.add_argument("json")
    p.add_argument("-o", "--output", default="preview.txt")
    p.set_defaults(func=cmd_preview)

    p = sub.add_parser("all", help="parse → validate → preview をまとめて実行")
    p.add_argument("book", choices=sorted(PARSERS), help="対象の書（enoch / mary）")
    p.add_argument("html")
    p.add_argument("--outdir", default="_artifacts")
    p.add_argument("--expect-chapters", type=int, default=None, help="未指定なら書ごとの既定値")
    p.set_defaults(func=cmd_all)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
