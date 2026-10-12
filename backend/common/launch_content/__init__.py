"""
公開前に入れておく「運営の投稿」の中身。seed_launch コマンドが読む。

文章は全部ここに手で書いてある（乱数で組み立てない）。直したいときは該当ファイルの
文字列を書き換えて、`python manage.py seed_launch --replace` で入れ直す。

箇所の書き方（コメント・Q&A・プランの読む章で共通）:
    "genesis"            書全体
    "genesis 3"          3章
    "genesis 3:1"        3章1節
    "@calvin-romans 8"   解釈書（@ の後ろは解釈書の slug）の8章
    "enoch 6|R. H. Charles (EN)"   プランだけ: 縦棒のあとに訳を指定すると、その訳で開く

投稿者（author）は accounts.py のキー（official / editors / guides）で書く。
記事の本文の印（[[john 1:1]] / {{john 1:1|KJV}}）は articles/citations.py の書式どおり。
"""

from .accounts import ACCOUNTS
from .articles_en import ARTICLES as ARTICLES_EN
from .articles_ja import ARTICLES as ARTICLES_JA
from .comments_en import THREADS as THREADS_EN
from .comments_ja import THREADS as THREADS_JA
from .plans_en import PLANS as PLANS_EN
from .plans_ja import PLANS as PLANS_JA
from .qa import QUESTIONS
from .translations import PROJECTS

# 先頭ほど新しい日付になる（一覧の上に来る）。英語を主に、日本語を混ぜる。
ARTICLES = ARTICLES_EN[:2] + ARTICLES_JA[:1] + ARTICLES_EN[2:] + ARTICLES_JA[1:]
THREADS = THREADS_EN + THREADS_JA
PLANS = PLANS_EN[:2] + PLANS_JA[:1] + PLANS_EN[2:] + PLANS_JA[1:]

__all__ = ["ACCOUNTS", "ARTICLES", "PLANS", "PROJECTS", "QUESTIONS", "THREADS"]
