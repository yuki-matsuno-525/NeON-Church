"""出典の注記（訳者・権利の説明）の英語版。

注記は日本語で書いてあるので、英語の画面ではここの英語版を出す。
seed を書き出すとき（common.write_seed）に translator_en / license_note_en として足す。
新しい注記を増やしたら、ここにも英語版を足す（無ければ英語の画面でも日本語のまま出る）。
"""

from __future__ import annotations

# 訳者の欄。日本語の注記 → 英語
TRANSLATOR_EN = {
    "Ante-Nicene / Nicene and Post-Nicene Fathers（Schaff 編, 1885–1900）ほか19世紀の英訳":
        "Ante-Nicene / Nicene and Post-Nicene Fathers (ed. Schaff, 1885–1900) and other 19th-century translations",
    "Marcus Dods（NPNF 第1集第2巻, 1887）": "Marcus Dods (NPNF Series 1, Vol. 2, 1887)",
    "Calvin Translation Society（エディンバラ, 1843–1855）": "Calvin Translation Society (Edinburgh, 1843–1855)",
    "John Henry Newman 編の英訳（1841–1845）": "English translation edited by John Henry Newman (1841–1845)",
    "Alexander Roberts & William Rambaut（ANF 第1巻, 1885）": "Alexander Roberts & William Rambaut (ANF Vol. 1, 1885)",
    "Marcus Dods & George Reith（ANF 第1巻, 1885）": "Marcus Dods & George Reith (ANF Vol. 1, 1885)",
    "Frederick Crombie（ANF 第4巻, 1885）": "Frederick Crombie (ANF Vol. 4, 1885)",
    "M. Rosenbaum & A. M. Silbermann（1929–1934）": "M. Rosenbaum & A. M. Silbermann (1929–1934)",
}

_CCEL = (
    "19世紀の英訳で米国ではパブリックドメイン。本文は CCEL の ThML 版による"
    "（CCEL の条件: 個人・教育・非営利の利用は可、商用は要許可）。聖書箇所は編集者が付けた引用の印による。"
)
_CCEL_EN = (
    "A 19th-century English translation, in the public domain in the United States. Text from the CCEL ThML edition "
    "(CCEL terms: personal, educational and non-commercial use permitted; commercial use requires permission). "
    "Bible references follow the editors' citation markup."
)
_AOZORA_EN = "Text from Aozora Bunko. The bibliographic notes below are from Aozora Bunko (in Japanese)."

# 権利の説明。日本語の注記の書き出し → 英語。長いもの（青空文庫の奥付つき）は書き出しで見分け、
# 奥付は日本語のまま後ろに残す（出典の記録なので訳さない）。
LICENSE_NOTE_EN = [
    ("節との対応はデータベース（パブリックドメイン宣言）による。本文は19世紀の英訳",
     "Verse mapping from a database dedicated to the public domain. Only excerpts from 19th-century English "
     "translations (public domain in the United States) are used; machine translations and excerpts of unknown "
     "origin are excluded (criteria in commentary/collectors/cdb.py)."),
    (_CCEL + " 節との対応は CCEL 版の「この節の注解」の区切りによる。",
     _CCEL_EN + " Verse mapping follows the per-verse divisions of the CCEL edition."),
    (_CCEL, _CCEL_EN),
    ("英訳は1841–1845年刊行でパブリックドメイン。",
     "The English translation was published 1841–1845 and is in the public domain. Verse mapping from a database "
     "dedicated to the public domain."),
    ("藤井武（1930年没）の著作で日本ではパブリックドメイン。",
     "Works of Fujii Takeshi (d. 1930), in the public domain in Japan. Published by OGCCL as copyright-free."),
    ("英訳は Sefaria で Public Domain と表示されている版。",
     "The English translation marked Public Domain on Sefaria. Chapter and verse numbers converted from the Hebrew "
     "Bible to the KJV numbering."),
    ("内村鑑三（1930年没）の著作で日本ではパブリックドメイン。本文は旭丘キリスト教会サイトの翻刻による。",
     "Works of Uchimura Kanzō (d. 1930), in the public domain in Japan. Text transcribed by Asahigaoka Christian "
     "Church."),
    ("内村鑑三（1930年没）の著作で日本ではパブリックドメイン。青空文庫のテキストによる。",
     "Works of Uchimura Kanzō (d. 1930), in the public domain in Japan. " + _AOZORA_EN),
]


def license_note_en(note: str) -> str:
    """権利の説明の英語版。知らない注記なら空（画面は日本語の注記を出す）。"""
    for prefix, english in LICENSE_NOTE_EN:
        if note == prefix:
            return english
        if note.startswith(prefix):
            rest = note[len(prefix):].strip()
            # 決まった文のあとに続くのは青空文庫の奥付。日本語のまま残す。
            return f"{english}\n{rest}" if rest else english
    return ""


def add_english_notes(data: dict) -> dict:
    """1冊ぶんのデータに translator_en / license_note_en を足す（すでにあれば上書きしない）。"""
    if not data.get("translator_en"):
        data["translator_en"] = TRANSLATOR_EN.get(data.get("translator", ""), "")
    if not data.get("license_note_en"):
        data["license_note_en"] = license_note_en(data.get("license_note", ""))
    return data
