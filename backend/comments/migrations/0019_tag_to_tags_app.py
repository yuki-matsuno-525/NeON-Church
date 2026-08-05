"""Tag の移設（その3: コメントの参照先を差し替え、古い所有者から外す）。

qa の差し替え（qa.0002）より後に走る必要がある。まだ comments.Tag を
指しているモデルが残っている状態で DeleteModel すると、状態が壊れるため。

ここでもデータベースには触らない。テーブル comment_tags は残り続け、
中身も外部キーもそのまま。
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("comments", "0018_remove_comment_comment_qa_recent_idx_and_more"),
        ("qa", "0002_question_tags_to_tags_app"),
        ("tags", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="comment",
                    name="tags",
                    field=models.ManyToManyField(
                        blank=True, related_name="comments", to="tags.tag"
                    ),
                ),
                migrations.DeleteModel(name="Tag"),
            ],
            database_operations=[],
        ),
    ]
