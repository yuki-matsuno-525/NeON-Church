from django.db import migrations


def create_verse_text_trgm_index(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS verses_text_trgm_idx
            ON verses USING gin (text gin_trgm_ops)
            """
        )


def drop_verse_text_trgm_index(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DROP INDEX IF EXISTS verses_text_trgm_idx")


class Migration(migrations.Migration):

    dependencies = [
        ("bible", "0003_alter_book_canonical_book"),
    ]

    operations = [
        migrations.RunPython(create_verse_text_trgm_index, drop_verse_text_trgm_index),
    ]
