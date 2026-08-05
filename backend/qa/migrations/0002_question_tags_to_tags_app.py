"""Tag の移設（その2: 質問の参照先を差し替える）。

M2M の中間テーブル（qa_question_tags）は変わらない。参照先の Tag が
同じテーブル（comment_tags）を使い続けるので、外部キーの指す先も同じ。
よってデータベースには触らない。
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("qa", "0001_initial"),
        ("tags", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="question",
                    name="tags",
                    field=models.ManyToManyField(
                        blank=True, related_name="questions", to="tags.tag"
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
