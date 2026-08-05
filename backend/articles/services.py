"""記事の書き込み。

本文に書かれた聖句参照を引用として取り出す処理（citations.py）と、
保存を必ず同じトランザクションにまとめるのがここの役目。

読み出しは selectors.py。
"""

from django.db import transaction

from .citations import sync_citations
from .models import Article, ArticleComment


def save_with_citations(serializer, **kwargs) -> Article:
    """記事を保存し、本文から引用を抽出し直す。

    引用だけ古いまま残ると節ページの「引用した記事」が嘘になるので、
    本文の保存と同じトランザクションに入れる。
    """
    with transaction.atomic():
        article = serializer.save(**kwargs)
        sync_citations(article)
        return article


def soft_delete_comment(comment: ArticleComment) -> None:
    """コメントを消す。返信のぶら下がり先を保つため行は消さない。

    所有者の判定はビュー側。本文なしの 403 を返す形を変えないため。
    """
    comment.is_deleted = True
    comment.save(update_fields=["is_deleted", "updated_at"])
