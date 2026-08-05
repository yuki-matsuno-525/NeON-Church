"""読書進捗の読み出し。"""

from django.db.models import QuerySet

from .models import ReadingProgress


def own_progress(user) -> QuerySet:
    """自分の進捗一覧。書名と章番号を出すので関連を先読みする。"""
    return ReadingProgress.objects.filter(user=user).select_related("book", "chapter")
