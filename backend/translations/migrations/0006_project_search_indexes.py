from django.db import migrations

# 検索で使う列に trigram の索引を張る。
# `LIKE '%…%'` は普通の索引が効かず、行が増えるほど全表走査になる。
# bible/0004 と同じやり方（生の SQL、PostgreSQL 以外では何もしない）。


INDEXES = [('translation_projects_name_trgm_idx', 'translation_projects', 'name'),
    ('translation_projects_desc_trgm_idx', 'translation_projects', 'description')]


def create(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        for name, table, column in INDEXES:
            cursor.execute(
                f"CREATE INDEX IF NOT EXISTS {name} ON {table} USING gin ({column} gin_trgm_ops)"
            )


def drop(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        for name, _table, _column in INDEXES:
            cursor.execute(f"DROP INDEX IF EXISTS {name}")


class Migration(migrations.Migration):

    dependencies = [
        ("translations", "0005_translationlibraryentry"),
    ]

    operations = [
        migrations.RunPython(create, drop),
    ]
