"""解釈書に章を足し、区切りに「章番号・区切り番号」を持たせる。

分け方ごと変わる（カルヴァン注解を聖書の書ごとに分けるなど）ので、今ある解釈書はいったん消し、
デプロイのあと import_commentary で入れ直す。この時点では解釈書にコメント等は付いていない。
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models


def clear_commentary(apps, schema_editor):
    # PostgreSQL では、1行ずつ消すと「消したあとの確認」が取引の終わりまで保留され、
    # 同じ取引の中で続けて表を作り替えられない（pending trigger events）。
    # TRUNCATE は保留を残さないので、そのあと同じマイグレーションで表を変えられる。
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("TRUNCATE commentary_passage_links, commentary_sections, commentary_works")
    else:
        apps.get_model("commentary", "Work").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("commentary", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(clear_commentary, migrations.RunPython.noop),
        migrations.CreateModel(
            name="CommentaryChapter",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("number", models.PositiveSmallIntegerField()),
                ("title", models.CharField(blank=True, max_length=500)),
                (
                    "work",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="chapters", to="commentary.work"
                    ),
                ),
            ],
            options={
                "db_table": "commentary_chapters",
                "ordering": ["number"],
                "unique_together": {("work", "number")},
            },
        ),
        migrations.AddField(
            model_name="section",
            name="chapter_number",
            field=models.PositiveSmallIntegerField(default=0),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="section",
            name="number",
            field=models.PositiveIntegerField(default=0),
            preserve_default=False,
        ),
        migrations.AlterUniqueTogether(
            name="section",
            unique_together={("work", "order"), ("work", "chapter_number", "number")},
        ),
        migrations.AlterField(
            model_name="passagelink",
            name="section",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="links",
                to="commentary.section",
            ),
        ),
        migrations.AddField(
            model_name="passagelink",
            name="commentary_chapter",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="links",
                to="commentary.commentarychapter",
            ),
        ),
        migrations.AddConstraint(
            model_name="passagelink",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    models.Q(("commentary_chapter__isnull", True), ("section__isnull", False)),
                    models.Q(("commentary_chapter__isnull", False), ("section__isnull", True)),
                    _connector="OR",
                ),
                name="commentary_link_one_target",
            ),
        ),
    ]
