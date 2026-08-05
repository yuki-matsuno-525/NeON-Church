"""Tag を comments アプリから tags アプリへ移す（その1: 新しい所有者を宣言する）。

テーブル `comment_tags` はそのまま使い続ける。移すのは Django が持つ
「どのアプリのモデルか」という状態だけで、データベースには一切触らない
（`database_operations=[]`）。

そのため本番でも ALTER / CREATE / DROP は一度も走らない。
デプロイ中に旧コードと新コードが混在しても、両方が同じテーブルを見る。
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        # comment_tags テーブルを実際に作ったのは comments の初期マイグレーション。
        # その後に状態だけを移す。
        ("comments", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="Tag",
                    fields=[
                        (
                            "id",
                            models.BigAutoField(
                                auto_created=True,
                                primary_key=True,
                                serialize=False,
                                verbose_name="ID",
                            ),
                        ),
                        ("name", models.CharField(max_length=20, unique=True)),
                    ],
                    options={
                        "db_table": "comment_tags",
                    },
                ),
            ],
            database_operations=[],
        ),
    ]
