"""記事の主題タグを最初の15個で埋める。"""

import uuid

from django.db import migrations

from articles.models import INITIAL_TAGS


def create_tags(apps, schema_editor):
    ArticleTag = apps.get_model("articles", "ArticleTag")
    for name, slug in INITIAL_TAGS:
        # 何度流しても増えないように、slug で照合してから作る。
        ArticleTag.objects.get_or_create(slug=slug, defaults={"id": uuid.uuid4(), "name": name})


def delete_tags(apps, schema_editor):
    ArticleTag = apps.get_model("articles", "ArticleTag")
    ArticleTag.objects.filter(slug__in=[slug for _, slug in INITIAL_TAGS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("articles", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_tags, delete_tags),
    ]
