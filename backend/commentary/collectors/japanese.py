"""無教会の解釈書（内村鑑三・藤井武）を集める。

どれも著者の没後70年以上が過ぎており（内村 1930年没・藤井 1930年没）、本文は日本でパブリックドメイン。
  - 内村鑑三『ロマ書の研究』 …… 旭丘キリスト教会サイトの翻刻（講ごとに対象箇所の一覧が付いている）
  - 内村鑑三『ヨブ記講演』『聖書の読方』 …… 青空文庫
  - 藤井武『黙示録講義』『黙示録研究』 …… OGCCL（著作権フリーと明記）

節との対応は
  - 講の題・見出しに書かれた箇所 → 構造（structure）
  - 本文中の「マタイ傳第十六章二一節」「（マラキ四の二）」、その書を講じている本での「八章二八節」 → 引用（citation）
"""

from __future__ import annotations

import re

import requests
from bs4 import BeautifulSoup

from commentary.refs import (
    SHORT_JAPANESE_TO_SLUG,
    Ref,
    find_bare_refs,
    find_japanese_refs,
    find_parenthetical_refs,
    parse_number,
)

from .common import clean_text, dedupe_links, link, split_paragraphs

USER_AGENT = "NeON-Church commentary collector (non-commercial)"


def fetch(url: str, encoding: str) -> str:
    res = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=60)
    res.raise_for_status()
    return res.content.decode(encoding, errors="replace")


def strip_ruby(soup: BeautifulSoup) -> None:
    """ルビ（振り仮名）を外して親文字だけ残す。"""
    for tag in soup.find_all(["rt", "rp"]):
        tag.decompose()


def citations_ja(text: str, default_book: str | None = None) -> list[dict]:
    """日本語本文から引用を集める。default_book を渡すと書名の無い「八章二八節」もその書として拾う。"""
    named = find_japanese_refs(text) + find_parenthetical_refs(text)
    links = [link(ref, "citation") for ref, _, _ in named]
    if default_book:
        taken = [(s, e) for _, s, e in named]
        links += [link(ref, "citation") for ref, _, _ in find_bare_refs(text, default_book, taken)]
    return links


def _chapters_in(heading: str, book: str) -> list[Ref]:
    """「第一章、二章の研究」「第三十八章」のような見出しから章を取り出し、続いている章は範囲にまとめる。"""
    nums = [parse_number(n) for n in re.findall(r"([〇一二三四五六七八九十百0-9０-９]+)\s*章", heading)]
    refs: list[Ref] = []
    for n in sorted(set(nums)):
        if refs and refs[-1].chapter_end == n - 1:
            refs[-1] = Ref(book, refs[-1].chapter, None, n, None)
        else:
            refs.append(Ref(book, n, None, n, None))
    return refs


_LECTURE_NO = re.compile(r"第\s*([0-9０-９〇一二三四五六七八九十百]+)\s*講")


def lecture_number(title: str, fallback: int) -> int:
    """「第四十一講」「第41講」から講の番号を取る。講でないもの（序など）は fallback。

    章の番号を講の番号にそろえると、「第41講」が /…/41 になって分かりやすい。
    """
    m = _LECTURE_NO.search(title)
    return parse_number(m.group(1)) if m else fallback


def lecture_chapter(number: int, title: str, text: str, structure: list[Ref],
                    default_book: str | None, source_url: str) -> dict:
    """講1つを章にする。講の対象箇所は章に、本文中の引用は段落（区切り）に付ける。"""
    return {
        "number": number,
        "title": title,
        "links": dedupe_links([link(r, "structure") for r in structure]),
        "sections": [
            {"heading": "", "text": p, "source_url": source_url,
             "links": dedupe_links(citations_ja(p, default_book=default_book))}
            for p in split_paragraphs(text)
        ],
    }


def _base(**kw) -> dict:
    return {"tradition": "mukyokai", "language": "ja", "license": "public-domain", "translator": "", **kw}


# ---------------------------------------------------------------------------
# 内村鑑三『ロマ書の研究』
# ---------------------------------------------------------------------------
ROMANS_BASE = "https://church.ne.jp/asahigaokaCC/text/"

_INDEX_PASSAGE = re.compile(
    r"(?P<b>" + "|".join(sorted(map(re.escape, SHORT_JAPANESE_TO_SLUG), key=len, reverse=True)) + r")\s*"
    r"(?:(?P<c>\d+):(?P<v>\d+)(?:-(?:(?P<c2>\d+):)?(?P<v2>\d+))?"
    r"|(?P<cc>\d+)(?:[,，](?P<cc2>\d+))?\s*[章篇])"
)


def parse_index_passage(cell: str) -> list[Ref]:
    """目次の「聖書箇所」欄（ローマ1:1-7 / ローマ2章 / ローマ9,10章 / Ⅰペテロ1:23-25 / 詩篇133篇）を読む。"""
    cell = cell.translate(str.maketrans("０１２３４５６７８９：", "0123456789:"))
    refs = []
    for m in _INDEX_PASSAGE.finditer(cell):
        book = SHORT_JAPANESE_TO_SLUG[m.group("b")]
        if m.group("c"):
            c, v = int(m.group("c")), int(m.group("v"))
            c2 = int(m.group("c2")) if m.group("c2") else c
            v2 = int(m.group("v2")) if m.group("v2") else v
            refs.append(Ref(book, c, v, c2, v2))
        else:
            c = int(m.group("cc"))
            c2 = int(m.group("cc2")) if m.group("cc2") else c
            refs.append(Ref(book, c, None, c2, None))
    return refs


def parse_romans_index(html: str) -> list[dict]:
    """目次ページから講の一覧（ファイル名・講題・対象箇所）を取り出す。"""
    soup = BeautifulSoup(html, "html.parser")
    lectures = []
    for a in soup.find_all("a", href=re.compile(r"^Romans\d+\.htm$", re.I)):
        row = a.find_parent("tr")
        cells = [td.get_text(" ", strip=True) for td in row.find_all("td")] if row else []
        title = cells[1] if len(cells) > 1 else a.get_text(strip=True)
        passage = cells[2] if len(cells) > 2 else ""
        lectures.append({"file": a["href"], "label": a.get_text(strip=True), "title": title, "passage": passage})
    return lectures


def parse_romans_page(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    strip_ruby(soup)
    for tag in soup.find_all(["script", "style", "title"]):
        tag.decompose()
    text = soup.get_text("\n")
    text = re.sub(r"《[^》]*》", "", text)  # 《目次へ》《前講》《次講》
    return clean_text(re.sub(r"\n[ \t　]*", "\n\n", text))


def collect_uchimura_romans() -> dict:
    index_html = fetch(ROMANS_BASE + "U_Rom_idx.htm", "cp932")
    chapters = []
    for lec in parse_romans_index(index_html):
        page = parse_romans_page(fetch(ROMANS_BASE + lec["file"], "cp932"))
        structure = parse_index_passage(lec["passage"])
        if re.search(r"ロマ書.*(大意|大觀)", lec["title"]):
            structure = [Ref("romans")]  # 書全体の概説（最初と最後の講）
        title = f"{lec['label']}　{lec['title']}".strip() if lec["label"] != lec["title"] else lec["title"]
        # 章の番号＝講の番号。講でない「序」は 0。
        number = lecture_number(lec["label"], 0)
        chapters.append(lecture_chapter(number, title, page, structure, "romans", ROMANS_BASE + lec["file"]))
    return _base(
        slug="uchimura-romans",
        title="羅馬書之研究", title_ja="ロマ書の研究",
        author="Uchimura Kanzō", author_ja="内村鑑三", year=1924,
        source_name="旭丘キリスト教会『内村鑑三「ロマ書の研究」』（翻刻）",
        source_url=ROMANS_BASE + "U_Rom_idx.htm",
        license_note="内村鑑三（1930年没）の著作で日本ではパブリックドメイン。本文は旭丘キリスト教会サイトの翻刻による。",
        readable=True,
        chapters=chapters,
    )


# ---------------------------------------------------------------------------
# 青空文庫（内村鑑三『ヨブ記講演』『聖書の読方』）
# ---------------------------------------------------------------------------
def parse_aozora(html: str) -> tuple[list[tuple[str, str]], str]:
    """青空文庫の XHTML を「（見出し, 本文）」の並びにする。2つめの戻り値は底本・入力者の情報。"""
    soup = BeautifulSoup(html, "html.parser")
    strip_ruby(soup)
    info_el = soup.find(class_="bibliographical_information")
    info = clean_text(info_el.get_text("\n")) if info_el else ""
    main = soup.find(class_="main_text") or soup.body
    # 見出しの前に目印を入れてから文字にし、目印で切る
    for h in main.find_all(class_="midashi_anchor"):
        h.insert_before("\n@@MIDASHI@@")
        h.insert_after("@@END@@\n")
    for br in main.find_all("br"):
        br.replace_with("\n")
    raw = main.get_text()
    parts: list[tuple[str, str]] = []
    heading = ""
    for chunk in raw.split("@@MIDASHI@@"):
        if "@@END@@" in chunk:
            h, body = chunk.split("@@END@@", 1)
            heading = h.strip()
        else:
            body = chunk
        body = clean_text(re.sub(r"\n", "\n\n", body))
        if body:
            parts.append((heading, body))
        elif heading and parts is not None:
            parts.append((heading, ""))
    return parts, info


def collect_uchimura_job() -> dict:
    url = "https://www.aozora.gr.jp/cards/000034/files/56908_64142.html"
    parts, info = parse_aozora(fetch(url, "cp932"))
    # 「第N講 題」の見出しの直後に「第M章の研究」の小見出しが来る。講ごとにまとめる。
    sections: list[dict] = []
    for heading, body in parts:
        if re.match(r"^第[〇一二三四五六七八九十百]+講", heading) or not sections:
            sections.append({"heading": heading, "text": body, "source_url": url, "links": []})
        else:
            sub = heading
            sections[-1]["heading"] += f"（{sub}）" if sub else ""
            sections[-1]["text"] = "\n\n".join(t for t in (sections[-1]["text"], body) if t)
            sections[-1]["links"] += [link(r, "structure") for r in _chapters_in(sub, "job")]
    sections = [s for s in sections if s["text"]]
    chapters = [
        lecture_chapter(lecture_number(s["heading"], n), s["heading"], s["text"], [], "job", url)
        | {"links": dedupe_links(s["links"])}
        for n, s in enumerate(sections, start=1)
    ]
    return _base(
        slug="uchimura-job",
        title="ヨブ記講演", title_ja="ヨブ記講演",
        author="Uchimura Kanzō", author_ja="内村鑑三", year=None,
        source_name="青空文庫", source_url="https://www.aozora.gr.jp/cards/000034/card56908.html",
        license_note="内村鑑三（1930年没）の著作で日本ではパブリックドメイン。青空文庫のテキストによる。\n" + info,
        readable=True,
        chapters=chapters,
    )


def collect_uchimura_yomikata() -> dict:
    url = "https://www.aozora.gr.jp/cards/000034/files/1218_18404.html"
    parts, info = parse_aozora(fetch(url, "cp932"))
    text = "\n\n".join(body for _, body in parts)
    # 短い1篇なので章は1つだけ
    chapters = [lecture_chapter(1, "聖書の読方", text, [], None, url)]
    return _base(
        slug="uchimura-seisho-no-yomikata",
        title="聖書の読方　来世を背景として読むべし", title_ja="聖書の読方",
        author="Uchimura Kanzō", author_ja="内村鑑三", year=None,
        source_name="青空文庫", source_url="https://www.aozora.gr.jp/cards/000034/card1218.html",
        license_note="内村鑑三（1930年没）の著作で日本ではパブリックドメイン。青空文庫のテキストによる。\n" + info,
        readable=True,
        chapters=chapters,
    )


# ---------------------------------------------------------------------------
# 藤井武『黙示録講義』『黙示録研究』（OGCCL）
# ---------------------------------------------------------------------------
OGCCL_BASE = "https://www.ogccl.org/fujii/"


def parse_ogccl_page(html: str) -> tuple[str, str, str]:
    """(題, 副題, 本文) を返す。副題は『黙示録講義』では「第二章（九月二十二日）」のような対象章。"""
    soup = BeautifulSoup(html, "html.parser")
    strip_ruby(soup)

    def text_of(el) -> str:
        return re.sub(r"\s+", " ", el.get_text()).strip()

    h1 = soup.find("h1")
    h2s = [text_of(h) for h in soup.find_all("h2")]
    subtitle = next((h for h in h2s if h != "藤井武"), "")
    article = soup.find("article") or soup.body
    paragraphs = [text_of(p) for p in article.find_all("p")]
    return (text_of(h1) if h1 else ""), subtitle, "\n\n".join(p for p in paragraphs if p)


def _collect_ogccl(index_file: str) -> list[tuple[str, str, str, str]]:
    index = BeautifulSoup(fetch(OGCCL_BASE + index_file, "utf-8"), "html.parser")
    rows = []
    for a in index.find_all("a", href=re.compile(r"_chap\d+\.html$")):
        url = OGCCL_BASE + a["href"]
        title, subtitle, text = parse_ogccl_page(fetch(url, "utf-8"))
        rows.append((url, title, subtitle, text))
    return rows


def collect_fujii_revelation_lectures() -> dict:
    chapters = []
    for n, (url, title, subtitle, text) in enumerate(_collect_ogccl("fujii005_index.html"), start=1):
        structure = _chapters_in(subtitle.split("（")[0], "revelation")
        heading = f"{title}（{subtitle}）" if subtitle else title
        chapters.append(lecture_chapter(lecture_number(title, n), heading, text, structure, "revelation", url))
    return _base(
        slug="fujii-revelation-lectures",
        title="黙示録講義", title_ja="黙示録講義",
        author="Fujii Takeshi", author_ja="藤井武", year=1929,
        source_name="OGCCL（オープン・ゴスペル・クリスチャン・センター・ライブラリー）",
        source_url=OGCCL_BASE + "fujii005_index.html",
        license_note="藤井武（1930年没）の著作で日本ではパブリックドメイン。OGCCL は「著作権フリー」として公開。",
        readable=True,
        chapters=chapters,
    )


def collect_fujii_revelation_studies() -> dict:
    chapters = [
        lecture_chapter(n, title, text, [], "revelation", url)
        for n, (url, title, _subtitle, text) in enumerate(_collect_ogccl("fujii006_index.html"), start=1)
    ]
    return _base(
        slug="fujii-revelation-studies",
        title="黙示録研究", title_ja="黙示録研究",
        author="Fujii Takeshi", author_ja="藤井武", year=None,
        source_name="OGCCL（オープン・ゴスペル・クリスチャン・センター・ライブラリー）",
        source_url=OGCCL_BASE + "fujii006_index.html",
        license_note="藤井武（1930年没）の著作で日本ではパブリックドメイン。OGCCL は「著作権フリー」として公開。",
        readable=True,
        chapters=chapters,
    )
