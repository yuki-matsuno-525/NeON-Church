"""CCEL（Christian Classics Ethereal Library）の ThML から解釈書を読み取る。

ThML は CCEL 独自の XML で、聖書の引用に <scripRef osisRef="Bible:Gen.1.1"> が付いている。
編集者（19世紀の英訳者）が本文・脚注の引用に付けたものなので、これを「引用」として使う。

  - parse_thml_work … 教父の著作（異端反駁・神の国など）。段落ごとに区切り、段落内の引用を拾う
  - parse_calvin ……… カルヴァン注解。<div class="Commentary" id="Bible:Gen.1.1"> が
                        「この節の注解」の単位なので、それを区切り（構造）にする

CCEL の利用条件: 個人・教育・非営利の利用は可、商用は要許可（本文自体は米国でパブリックドメイン）。
"""

from __future__ import annotations

import warnings
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag, XMLParsedAsHTMLWarning

from commentary.refs import ENGLISH_TO_SLUG, parse_osis

from .common import clean_text, dedupe_links, link

CCEL_BASE = "https://www.ccel.org/ccel"
LICENSE_NOTE = (
    "19世紀の英訳で米国ではパブリックドメイン。本文は CCEL の ThML 版による"
    "（CCEL の条件: 個人・教育・非営利の利用は可、商用は要許可）。聖書箇所は編集者が付けた引用の印による。"
)

# slug → 収集設定。volume は CCEL の ThML ファイル名（https://www.ccel.org/ccel/schaff/<volume>.xml）、
# divs はその中の著作本体の div id。
CCEL_WORKS: dict[str, dict] = {
    "justin-dialogue-with-trypho": {
        "volume": "anf01", "divs": ["viii.iv"],
        "title": "Dialogue with Trypho", "title_ja": "ユダヤ人トリュフォンとの対話",
        "author": "Justin Martyr", "author_ja": "殉教者ユスティノス", "year": 155,
        "translator": "Marcus Dods & George Reith（ANF 第1巻, 1885）",
    },
    "irenaeus-against-heresies": {
        "volume": "anf01", "divs": ["ix.ii", "ix.iii", "ix.iv", "ix.vi", "ix.vii"],
        "title": "Against Heresies", "title_ja": "異端反駁",
        "author": "Irenaeus", "author_ja": "エイレナイオス", "year": 180,
        "translator": "Alexander Roberts & William Rambaut（ANF 第1巻, 1885）",
    },
    "origen-against-celsus": {
        "volume": "anf04", "divs": ["vi.ix"],
        "title": "Against Celsus", "title_ja": "ケルソス駁論",
        "author": "Origen of Alexandria", "author_ja": "オリゲネス", "year": 248,
        "translator": "Frederick Crombie（ANF 第4巻, 1885）",
    },
    "augustine-city-of-god": {
        "volume": "npnf102", "divs": ["iv"],
        "title": "The City of God", "title_ja": "神の国",
        "author": "Augustine of Hippo", "author_ja": "ヒッポのアウグスティヌス", "year": 426,
        "translator": "Marcus Dods（NPNF 第1集第2巻, 1887）",
    },
}

CALVIN_VOLUMES = [f"calcom{i:02d}" for i in range(1, 46)]

_SLUG_TO_ENGLISH = {}
for _name, _slug in ENGLISH_TO_SLUG.items():
    _SLUG_TO_ENGLISH.setdefault(_slug, _name)


def _soup(xml_text: str) -> BeautifulSoup:
    # html.parser は要素名・属性名を小文字にする（scripRef → scripref、osisRef → osisref）。
    # lxml を依存に足さないため XML も html.parser で読む（ThML ではこれで足りる）。
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", XMLParsedAsHTMLWarning)
        return BeautifulSoup(xml_text, "html.parser")


def _text_without_notes(el: Tag) -> str:
    """脚注（<note>）を除いた本文。脚注は訳者の補足なので本文には入れない。"""
    parts: list[str] = []
    for node in el.descendants:
        if isinstance(node, NavigableString):
            if any(p.name == "note" for p in node.parents if isinstance(p, Tag)):
                continue
            parts.append(str(node))
    return clean_text("".join(parts))


def _citations(el: Tag) -> list[dict]:
    """要素の中（脚注を含む）の scripRef を引用として集める。"""
    links = []
    for ref in el.find_all("scripref"):
        for r in parse_osis(ref.get("osisref", "")):
            links.append(link(r, "citation"))
    return links


def _heading(p: Tag, root: Tag) -> str:
    """段落を囲む div の見出しを外側から並べる（例: "Book I › Chapter X"）。"""
    titles = []
    for parent in p.parents:
        if parent is root.parent:
            break
        if isinstance(parent, Tag) and parent.name and parent.name.startswith("div") and parent.get("title"):
            titles.append(parent["title"].strip())
    return " › ".join(reversed(titles))


def parse_thml_work(xml_text: str, div_ids: list[str], source_url: str) -> list[dict]:
    """指定した div（著作の本体）を段落ごとの区切りにする。

    div_ids は ThML の div の id（例: ["ix.ii", "ix.iii"] で異端反駁の第1〜2巻）。
    """
    soup = _soup(xml_text)
    sections: list[dict] = []
    for div_id in div_ids:
        root = soup.find(id=div_id)
        if root is None:
            raise ValueError(f"div が見つかりません: {div_id}")
        for p in root.find_all("p"):
            if p.find_parent("note") is not None:
                continue  # 脚注の中の段落は、親の段落の一部として扱う
            text = _text_without_notes(p)
            if len(text) < 2:
                continue
            sections.append(
                {
                    "heading": _heading(p, root),
                    "text": text,
                    "source_url": f"{source_url}#{p.get('id', '')}" if p.get("id") else source_url,
                    "links": dedupe_links(_citations(p)),
                }
            )
    return sections


def parse_calvin(xml_text: str, source_url: str) -> list[dict]:
    """カルヴァン注解1巻を「節ごとの注解」の区切りにする。"""
    soup = _soup(xml_text)
    sections: list[dict] = []
    for div in soup.find_all("div", class_="Commentary"):
        # 巻によって「どの節の注解か」の書き方が2通りある。
        #   <div class="Commentary" id="Bible:Gen.1.1">（創世記など）
        #   <scripCom osisRef="Bible:Luke.1.1"/> の直後に <div class="Commentary" id="ix.i-p4.2">（福音書・律法の調和など）
        own = parse_osis(div.get("id", ""))
        if not own:
            marker = div.find_previous("scripcom")
            own = parse_osis(marker.get("osisref", "")) if marker else []
        if not own:
            continue
        paragraphs = [_text_without_notes(p) for p in div.find_all("p") if p.find_parent("note") is None]
        text = "\n\n".join(t for t in paragraphs if t)
        if not text:
            continue
        own_keys = {(r.book, r.chapter, r.verse) for r in own}
        cited = [c for c in _citations(div) if (c["book"], c["chapter"], c["verse"]) not in own_keys]
        first = own[0]
        name = _SLUG_TO_ENGLISH.get(first.book, first.book)
        heading = f"{name} {first.chapter}:{first.verse}" if first.verse else f"{name} {first.chapter}"
        sections.append(
            {
                "heading": heading,
                "text": text,
                "source_url": source_url,
                "links": dedupe_links([link(r, "structure") for r in own] + cited),
            }
        )
    return sections


def collect_ccel_work(slug: str, ccel_dir: Path) -> dict:
    """CCEL_WORKS の1冊を、手元に落とした ThML（<ccel_dir>/<volume>.xml）から作る。"""
    cfg = CCEL_WORKS[slug]
    volume = cfg["volume"]
    source_url = f"{CCEL_BASE}/schaff/{volume}.html"
    xml_text = (ccel_dir / f"{volume}.xml").read_text(encoding="utf-8")
    return {
        "slug": slug,
        **{k: cfg[k] for k in ("title", "title_ja", "author", "author_ja", "year", "translator")},
        "tradition": "patristic", "language": "en",
        "source_name": f"Christian Classics Ethereal Library（{volume}）", "source_url": source_url,
        "license": "public-domain", "license_note": LICENSE_NOTE,
        "readable": True,
        "sections": parse_thml_work(xml_text, cfg["divs"], source_url),
    }


def collect_calvin(ccel_dir: Path) -> dict:
    """カルヴァン注解全45巻（<ccel_dir>/calcomNN.xml）を1冊にまとめる。"""
    sections = []
    for volume in CALVIN_VOLUMES:
        source_url = f"{CCEL_BASE}/calvin/{volume}.html"
        sections += parse_calvin((ccel_dir / f"{volume}.xml").read_text(encoding="utf-8"), source_url)
    return {
        "slug": "calvin-commentaries",
        "title": "Calvin's Commentaries", "title_ja": "カルヴァン聖書注解",
        "author": "John Calvin", "author_ja": "ジャン・カルヴァン", "year": 1555,
        "tradition": "reformation", "language": "en",
        "translator": "Calvin Translation Society（エディンバラ, 1843–1855）",
        "source_name": "Christian Classics Ethereal Library", "source_url": f"{CCEL_BASE}/calvin/commentaries.i.html",
        "license": "public-domain",
        "license_note": LICENSE_NOTE + " 節との対応は CCEL 版の「この節の注解」の区切りによる。",
        "readable": True,
        "sections": sections,
    }
