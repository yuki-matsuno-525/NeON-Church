"""
運営アカウント。投稿者はこの 3 つだけ（架空の一般ユーザーは作らない）。

名前で運営だと分かるように、全員 NeONChurch で始める。
自己紹介には、AI の助けを借りて書いた投稿であることを明記する（公開前に決めた方針）。
"""

ACCOUNTS = {
    # 公式。サイトの案内・お知らせ・翻訳プロジェクトの立ち上げ。
    "official": {
        "username": "NeONChurch",
        "bio": (
            "The official account of NeON Church — a place to read the Bible, the deuterocanon, "
            "and early Christian writings side by side, and to talk about them. "
            "Posts from this account are written by the people who run the site with help from AI, "
            "and checked against the texts here.\n"
            "NeON Church 運営の公式アカウントです。投稿は運営が AI の助けを借りて書いています。"
        ),
    },
    # 編集部。記事と、節に置く「問い」とさまざまな読み方。
    "editors": {
        "username": "NeONChurch_Editors",
        "bio": (
            "The NeON Church editors. We post questions and readings that open a passage from "
            "more than one side — traditional, skeptical, literary, ethical — and leave the "
            "disagreements standing. We don't speak for any church. "
            "Drafted with help from AI and checked by the editors. Corrections are welcome: reply or report.\n"
            "NeON Church 編集部（運営）。AI の助けを借りて書き、運営が確認しています。"
        ),
    },
    # 案内係。読書プランと Q&A の回答、書の紹介。
    "guides": {
        "username": "NeONChurch_Guides",
        "bio": (
            "NeON Church guides. We build reading plans, write short introductions to the books "
            "on this site, and answer the questions newcomers ask most. "
            "Written by the site team with help from AI. If something is wrong, tell us in a reply.\n"
            "NeON Church 案内係（運営）。読書プランと Q&A を担当。AI の助けを借りて書いています。"
        ),
    },
}
