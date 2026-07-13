from django.db import migrations


def create_comment_body_trgm_index(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS comments_body_trgm_idx
            ON comments USING gin (body gin_trgm_ops)
            """
        )


def drop_comment_body_trgm_index(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DROP INDEX IF EXISTS comments_body_trgm_idx")


class Migration(migrations.Migration):

    dependencies = [
        ("comments", "0014_remove_comment_book_remove_comment_chapter_and_more"),
    ]

    operations = [
        migrations.RunPython(create_comment_body_trgm_index, drop_comment_body_trgm_index),
    ]
