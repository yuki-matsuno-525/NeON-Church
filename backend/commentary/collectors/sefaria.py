"""Sefaria からラシのトーラー（モーセ五書）注解を集める。

英訳は M. Rosenbaum & A. M. Silbermann（1929–1934、パブリックドメイン）。
Sefaria の本文は [章][節][注解] の入れ子になっていて、注解がどの節についてかは
本の作りそのもの（構造）で決まる。番号はヘブライ語聖書のものなので KJV の番号へ直す。
"""

from __future__ import annotations

import re
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

from commentary.refs import ENGLISH_TO_SLUG, Ref
from commentary.versification import hebrew_to_kjv

from .common import clean_text, dedupe_links, link, split_by_bible_book
from .japanese import USER_AGENT

VERSION = "Pentateuch with Rashi's commentary by M. Rosenbaum and A.M. Silbermann, 1929-1934"
BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"]
TORAH = {ENGLISH_TO_SLUG[b] for b in BOOKS}

# 本文中の「(Exodus 12:2)」のような引用。ヘブライ語の番号なのでモーセ五書だけ KJV へ直して使う
# （詩篇などは表題の数え方で節がずれるため、ここでは拾わない）。
_INLINE = re.compile(r"\((?P<b>Genesis|Exodus|Leviticus|Numbers|Deuteronomy) (?P<c>\d+):(?P<v>\d+)(?:-(?P<v2>\d+))?\)")


def fetch_book(book: str) -> list:
    url = f"https://www.sefaria.org/api/v3/texts/Rashi_on_{book}?version={quote('english|' + VERSION)}"
    res = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=120)
    res.raise_for_status()
    data = res.json()
    version = data["versions"][0]
    if version["versionTitle"] != VERSION or version.get("license") != "Public Domain":
        raise ValueError(f"想定と違う版です: {version['versionTitle']} / {version.get('license')}")
    return version["text"]


def _plain(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for sup in soup.find_all("sup", class_="footnote-marker"):
        sup.decompose()
    for fn in soup.find_all("i", class_="footnote"):
        fn.decompose()
    return clean_text(soup.get_text())


def _kjv_ref(slug: str, ch: int, v: int, v2: int | None = None) -> Ref:
    c1, n1 = hebrew_to_kjv(slug, ch, v)
    c2, n2 = hebrew_to_kjv(slug, ch, v2 if v2 else v)
    return Ref(slug, c1, n1, c2, n2)


def sections_from_book(book: str, text: list) -> list[dict]:
    """Sefaria の入れ子の本文を区切りの並びにする。"""
    slug = ENGLISH_TO_SLUG[book]
    sections = []
    for ci, chapter in enumerate(text, start=1):
        for vi, comments in enumerate(chapter, start=1):
            for comment in comments or []:
                body = _plain(comment)
                if not body:
                    continue
                own = _kjv_ref(slug, ci, vi)
                links = [link(own, "structure")]
                for m in _INLINE.finditer(body):
                    s = ENGLISH_TO_SLUG[m.group("b")]
                    if s in TORAH:
                        v2 = int(m.group("v2")) if m.group("v2") else None
                        links.append(link(_kjv_ref(s, int(m.group("c")), int(m.group("v")), v2), "citation"))
                sections.append({
                    "heading": f"{book} {own.chapter}:{own.verse}",
                    "text": body,
                    "source_url": f"https://www.sefaria.org/Rashi_on_{book}.{ci}.{vi}",
                    "links": dedupe_links(links),
                })
    return sections


def collect_rashi() -> list[dict]:
    """ラシのモーセ五書注解。書ごとの5冊にする。"""
    sections = []
    for book in BOOKS:
        sections += sections_from_book(book, fetch_book(book))
    meta = {
        "author": "Rashi (Shlomo Yitzchaki)", "author_ja": "ラシ（シュロモ・イツハキ）", "year": 1100,
        "tradition": "jewish", "language": "en",
        "translator": "M. Rosenbaum & A. M. Silbermann（1929–1934）",
        "source_name": "Sefaria", "source_url": "https://www.sefaria.org/Rashi_on_Genesis",
        "license": "public-domain",
        "license_note": "英訳は Sefaria で Public Domain と表示されている版。章節はヘブライ語聖書の番号を KJV の番号へ直した。",
        "readable": False,
    }
    return split_by_bible_book(meta, sections, "rashi", "ラシ {book}注解", "Rashi on {book}")
