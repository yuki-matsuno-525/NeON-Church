"""注解データベース（HistoricalChristianFaith/Commentaries-Database）から教父の注解を集める。

このデータベースは「著者/書名 章_節.toml」に、その節についての教父の文章の抜粋を並べたもの。
節との対応は人の手で付けられているので「構造」として扱う。

権利の注意（ここが一番大事）:
  データベース全体は著作権放棄と宣言されているが、中身には
    1. 19世紀の英訳（ANF/NPNF・カテナ・アウレアの Newman 訳）…… パブリックドメイン
    2. HCF が ChatGPT で新しく訳したもの ……………………………… 機械翻訳
    3. 出典の無い抜粋（現代の注解叢書からの引用とみられる）……… 著作権が残る可能性
  が混ざっている。ここでは 1 だけを入れる。判定は
    - 出典 URL が New Advent / CCEL の Schaff 版 / tertullian.org の fathers2（ANF/NPNF の写し）
    - または HCF 上の本文で、下の ALLOWED に挙げた著作（ANF/NPNF・Library of the Fathers 所収と確認したもの）
  のどちらか。HCF 上の本文は、さらに冒頭に機械翻訳の印が無いことも確かめる（classify_hcf_file）。
"""

from __future__ import annotations

import re
import tomllib
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from commentary.refs import OSIS_TO_SLUG, parse_cdb_filename

from .common import chapters_by_bible_book, link, split_by_bible_book

# 書の並び順（旧約→第二正典→新約）。抜粋集の区切りを聖書の順に並べるのに使う。
_BOOK_ORDER = {slug: i for i, slug in enumerate(OSIS_TO_SLUG.values())}

REPO_URL = "https://github.com/HistoricalChristianFaith/Commentaries-Database"

# 教父ごとの設定。allowed は HCF 上の著作パス（著者フォルダからの相対）の先頭一致。
FATHERS: dict[str, dict] = {
    "Irenaeus": {
        "slug": "irenaeus-excerpts", "author_ja": "エイレナイオス", "year": 180,
        # 『異端反駁』は全文を別に入れる（irenaeus-against-heresies）ので、ここでは除く。
        "allowed": ["Fragments from the Lost Writings of Irenaeus", "The Proof of the Apostolic Preaching"],
        "exclude_newadvent": ["/fathers/0103"],
    },
    "Tertullian": {
        "slug": "tertullian-excerpts", "author_ja": "テルトゥリアヌス", "year": 210,
        "allowed": [""],  # HCF 上のテルトゥリアヌスは全て ANF 3・4 巻の英訳
    },
    "Origen of Alexandria": {
        "slug": "origen-excerpts", "author_ja": "オリゲネス", "year": 240,
        # 『ケルソス駁論』は全文を別に入れる。雅歌注解・ヘラクレイデスとの対話は現代訳の可能性があるので除く。
        "allowed": ["Commentary on John", "Commentary on Matthew", "De Principiis", "On Prayer",
                    "A Letter from Origen", "A Letter to Origen", "Letter of Origen"],
        "exclude_newadvent": ["/fathers/0416"],
    },
    "Athanasius of Alexandria": {"slug": "athanasius-excerpts", "author_ja": "アタナシオス", "year": 350, "allowed": [""]},
    "Ephrem the Syrian": {"slug": "ephrem-excerpts", "author_ja": "シリアのエフレム", "year": 360, "allowed": [""]},
    "Basil of Caesarea": {
        "slug": "basil-excerpts", "author_ja": "カイサリアのバシレイオス", "year": 370,
        "allowed": ["The Hexaemeron", "ON THE SPIRIT", "Letters"],
    },
    "Gregory of Nazianzus": {
        "slug": "gregory-nazianzus-excerpts", "author_ja": "ナジアンゾスのグレゴリオス", "year": 380,
        "allowed": ["Orations", "Letters"],
    },
    "Gregory of Nyssa": {"slug": "gregory-nyssa-excerpts", "author_ja": "ニュッサのグレゴリオス", "year": 380, "allowed": [""]},
    "Ambrose of Milan": {
        "slug": "ambrose-excerpts", "author_ja": "ミラノのアンブロシウス", "year": 390,
        "allowed": ["Letters", "On the Holy Spirit", "Exposition of the Christian Faith", "ON THE DUTIES OF THE CLERGY",
                    "On the Decease of His Brother", "Concerning Repentance", "Concerning Virgins",
                    "Concerning Widows", "Sermon Against Auxentius"],
    },
    "John Chrysostom": {
        "slug": "chrysostom-excerpts", "author_ja": "ヨアンネス・クリュソストモス", "year": 400,
        # 『ユダヤ人駁論』『金持ちとラザロ』は現代訳の可能性があるので除く。
        "allowed": ["Homilies", "TREATISE ON THE PRIESTHOOD", "An Exhortation to Theodore", "Letters to Olympias",
                    "Instructions to Catechumens", "Letter to a Young Widow", "A Treatise to Prove",
                    "Eulogy Saint Ignatius", "To Those Who Had Not Attended"],
    },
    "Jerome": {
        "slug": "jerome-excerpts", "author_ja": "ヒエロニムス", "year": 400,
        # 聖書注解の多くは HCF の機械翻訳。人の訳が確かなもの（NPNF 2-6）だけ。
        "allowed": ["Letters", "Biblical Prefaces", "Lives of Illustrious Men", "The Perpetual Virginity",
                    "Against the Pelagians", "To Pammachius Against John", "The Life of S. Hilarion",
                    "Against Jovinianus", "Against Vigilantius"],
    },
    "Augustine of Hippo": {
        "slug": "augustine-excerpts", "author_ja": "ヒッポのアウグスティヌス", "year": 420,
        # 『神の国』は全文を別に入れる（augustine-city-of-god）。
        "allowed": [""],
        "exclude": ["The City of God"],
        "exclude_newadvent": ["/fathers/1201"],
    },
    "Gregory the Dialogist": {
        "slug": "gregory-great-excerpts", "author_ja": "大グレゴリウス", "year": 595,
        # 『ヨブ記講解（モラリア）』は Library of the Fathers（1844）の英訳。福音書講話・列王記注解・
        # エゼキエル書講話は訳者が確かめられないので除く。
        "allowed": ["Morals on the Book of Job", "THE BOOK OF PASTORAL RULE", "Register of Epistles"],
    },
}
# 大グレゴリウスの後はベーダ（ラテン語圏・8世紀）。人の英訳は HCF に無いので、
# カテナ・アウレアに引かれた部分（catena-aurea）でだけ登場する。

CATENA_MARK = "Thomas Aquinas/Catena Aurea/"

_MACHINE_MARK = re.compile(
    r"(Latin|Greek|Syriac) source:|translation is released into the public domain|using ChatGPT|"
    r"Translated from Migne",
    re.I,
)


def classify_hcf_file(head: str) -> str:
    """HCF 本文ファイルの冒頭から、機械翻訳か人の訳かを判定する。"""
    return "machine" if _MACHINE_MARK.search(head) else "human"


def classify_hcf_tarball(tar_path: Path) -> dict[str, str]:
    """Writings-Database の tar.gz を読み、ファイルごとに human / machine を返す。

    tar.gz は https://codeload.github.com/HistoricalChristianFaith/Writings-Database/tar.gz/refs/heads/master
    （Windows ではファイル名にコロンを含むものがあり git clone できないので、展開せずに読む）。
    """
    import tarfile

    result: dict[str, str] = {}
    with tarfile.open(tar_path, "r:gz") as tf:
        for member in tf:
            if not member.isfile() or not member.name.endswith(".html"):
                continue
            path = member.name.split("/", 1)[1]  # 先頭の "Writings-Database-master/" を外す
            head = tf.extractfile(member).read(4000).decode("utf-8", "replace")
            result[path] = classify_hcf_file(head)
    return result


def hcf_file_path(url: str) -> str | None:
    """HCF の by_father.php?file=... から本文ファイルのパス（著者/著作/…）を取り出す。"""
    p = urlparse(url)
    if p.netloc != "historicalchristian.faith":
        return None
    file = parse_qs(p.query).get("file", [""])[0]
    return unquote(unquote(file)) or None


def is_allowed(author: str, url: str, config: dict, hcf_class: dict[str, str]) -> bool:
    """この抜粋を入れてよいか（上の「権利の注意」の判定）。"""
    p = urlparse(url or "")
    host = p.netloc
    if host.endswith("newadvent.org"):
        return not any(p.path.startswith(x) for x in config.get("exclude_newadvent", []))
    if host.endswith("ccel.org"):
        return "/schaff/" in p.path
    if host.endswith("tertullian.org"):
        return "/fathers2/" in p.path
    path = hcf_file_path(url or "")
    if not path:
        return False
    if CATENA_MARK in path:
        return False  # カテナ・アウレアは別の本（catena-aurea）にまとめる
    if hcf_class.get(path) != "human":
        return False
    prefix = f"{author}/"
    if not path.startswith(prefix):
        return False
    rest = path[len(prefix):]
    if any(rest.startswith(x) for x in config.get("exclude", [])):
        return False
    return any(rest.startswith(a) for a in config["allowed"])


def _iter_entries(author_dir: Path):
    """著者フォルダの (Ref, 抜粋) を順に返す。"""
    for f in sorted(author_dir.glob("*.toml")):
        if f.name == "metadata.toml":
            continue
        ref = parse_cdb_filename(f.stem)
        if ref is None:
            continue
        try:
            data = tomllib.loads(f.read_text(encoding="utf-8"))
        except tomllib.TOMLDecodeError:
            continue
        for entry in data.get("commentary", []):
            if entry.get("quote", "").strip():
                yield ref, entry


def _sort_key(ref) -> tuple:
    return (_BOOK_ORDER.get(ref.book, 999), ref.chapter or 0, ref.verse or 0)


def _section(ref, entry: dict, heading: str) -> dict:
    return {
        "heading": heading.strip(),
        "text": entry["quote"].strip(),
        "source_url": entry.get("source_url") or "",
        "links": [link(ref, "structure")],
    }


def collect_father(cdb_root: Path, author: str, hcf_class: dict[str, str]) -> dict:
    """教父1人ぶんの抜粋集を作る。"""
    config = FATHERS[author]
    rows = []
    for ref, entry in _iter_entries(cdb_root / author):
        if is_allowed(author, entry.get("source_url", ""), config, hcf_class):
            rows.append((ref, entry))
    rows.sort(key=lambda r: _sort_key(r[0]))
    return {
        "slug": config["slug"],
        "title": f"{author}: commentary excerpts by verse",
        "title_ja": f"{config['author_ja']} 節ごとの注解抜粋",
        "author": author,
        "author_ja": config["author_ja"],
        "year": config["year"],
        "tradition": "patristic",
        "language": "en",
        "translator": "Ante-Nicene / Nicene and Post-Nicene Fathers（Schaff 編, 1885–1900）ほか19世紀の英訳",
        "source_name": "Historical Christian Faith — Commentaries Database",
        "source_url": REPO_URL,
        "license": "public-domain",
        "license_note": (
            "節との対応はデータベース（パブリックドメイン宣言）による。本文は19世紀の英訳（米国でパブリックドメイン）の"
            "抜粋だけを採用し、機械翻訳・出典不明の抜粋は除いた（commentary/collectors/cdb.py の基準）。"
        ),
        "readable": False,
        # 章＝聖書の書、区切り＝抜粋1つ
        "chapters": chapters_by_bible_book([_section(ref, e, e.get("source_title") or "") for ref, e in rows]),
    }


def collect_catena(cdb_root: Path) -> list[dict]:
    """カテナ・アウレア（トマス・アクィナスが福音書の節ごとに教父の言葉を集めた本）。福音書ごとの4冊にする。

    データベースでは引用された教父ごとのフォルダに散らばっているので、全フォルダから拾い集める。
    """
    rows = []
    for author_dir in sorted(p for p in cdb_root.iterdir() if p.is_dir() and not p.name.startswith(".")):
        for ref, entry in _iter_entries(author_dir):
            path = hcf_file_path(entry.get("source_url", "")) or ""
            if CATENA_MARK in path:
                rows.append((ref, author_dir.name, entry))
    rows.sort(key=lambda r: (_sort_key(r[0]), r[1]))
    meta = {
        "author": "Thomas Aquinas",
        "author_ja": "トマス・アクィナス",
        "year": 1264,
        "tradition": "medieval",
        "language": "en",
        "translator": "John Henry Newman 編の英訳（1841–1845）",
        "source_name": "Historical Christian Faith — Commentaries Database",
        "source_url": REPO_URL,
        "license": "public-domain",
        "license_note": "英訳は1841–1845年刊行でパブリックドメイン。節との対応はデータベース（パブリックドメイン宣言）による。",
        "readable": False,
    }
    sections = [_section(ref, e, author) for ref, author, e in rows]
    return split_by_bible_book(meta, sections, "catena-aurea", "カテナ・アウレア {book}", "Catena Aurea: {book}")
