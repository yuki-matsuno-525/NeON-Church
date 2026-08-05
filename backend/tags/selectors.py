"""タグの読み出し。タグは作られたら変わらないので services.py は無い。"""

from django.db.models import QuerySet

from .models import Tag


def all_tags() -> QuerySet:
    """選択肢に出すタグ一覧。表示順を安定させるため名前順にする。"""
    return Tag.objects.all().order_by("name")
