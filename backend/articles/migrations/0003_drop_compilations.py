"""
編纂（compilations）のテーブルを落とす。

編纂機能は記事とプランに作り直したので、アプリごと削除した。
アプリを消すと Django はそのテーブルの存在を忘れるため、ここで明示的に落とす。
本番にだけ残っているテーブルなので、新しい環境では「無いので何もしない」で通る。
"""

from django.db import migrations

# 落とす順は問わない（依存は CASCADE / 外部キーごと消える）が、
# 子から親の順に並べておく。
TABLES = [
    "compiled_comments",
    "compiled_verses_motifs",
    "compiled_chapters_motifs",
    "compiled_books_motifs",
    "compiled_verses",
    "compiled_chapters",
    "compiled_books",
    "motif_tags",
]


def drop_tables(apps, schema_editor):
    connection = schema_editor.connection
    # PostgreSQL は外部キーごと落とすため CASCADE が要る。SQLite には CASCADE が無い。
    suffix = " CASCADE" if connection.vendor == "postgresql" else ""
    with connection.cursor() as cursor:
        for table in TABLES:
            cursor.execute(f'DROP TABLE IF EXISTS "{table}"{suffix}')
        # 消したアプリの適用履歴も片付ける（残っていても害はないが、紛らわしいので）。
        cursor.execute("DELETE FROM django_migrations WHERE app = 'compilations'")


def noop(apps, schema_editor):
    """元には戻せない（消したデータは復元できない）ので、巻き戻しは何もしない。"""


class Migration(migrations.Migration):

    dependencies = [
        ("articles", "0002_seed_article_tags"),
    ]

    operations = [
        migrations.RunPython(drop_tables, noop),
    ]
