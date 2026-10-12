"""どの版（訳）で見せるかを決める共通処理。

「指定された訳 → 既定の訳 → order が最小の版」という同じ選び方が、本文 API・
記事の引用・プランの書名の3箇所に別々に書かれていた。片方だけ直すと画面ごとに
違う訳が出てしまうので、選び方はここ1つに置く。
"""

from common.language import ui_language

# 指定が無いとき・指定の訳がまだ収録されていないときに探す訳。
DEFAULT_TRANSLATION = "口語訳"

# 画面の言語ごとの既定の訳。英語の画面で日本語の書名・本文が出ないように、
# 英語なら KJV を先に探す（無ければ口語訳 → order が最小の版）。
DEFAULT_TRANSLATION_BY_LANGUAGE = {"en": "KJV", "ja": DEFAULT_TRANSLATION}


def pick_edition(editions, translation: str | None):
    """版の集まりから見せる1冊を決める。

    指定された訳がまだ収録されていなくても None は返さず、画面の言語の既定の訳
    （英語なら KJV、日本語なら口語訳）か、それも無ければ order が最小の版にたおす。読めないより、別の訳で読めて
    「今どの訳を見ているか」が分かるほうがよい。
    版が1つも無いときだけ None を返す。
    """
    editions = list(editions)
    if not editions:
        return None
    if translation:
        for book in editions:
            if book.translation == translation:
                return book
    language_default = DEFAULT_TRANSLATION_BY_LANGUAGE.get(ui_language(), DEFAULT_TRANSLATION)
    for preferred in (language_default, DEFAULT_TRANSLATION):
        for book in editions:
            if book.translation == preferred:
                return book
    return min(editions, key=lambda book: (book.order, book.translation))
