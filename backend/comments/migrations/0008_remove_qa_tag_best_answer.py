import django.db.models.deletion
from django.db import migrations, models

REMOVE_TAGS = ["質問"]


def remove_qa_tag(apps, schema_editor):
    Tag = apps.get_model("comments", "Tag")
    Tag.objects.filter(name__in=REMOVE_TAGS).delete()


def restore_qa_tag(apps, schema_editor):
    Tag = apps.get_model("comments", "Tag")
    for name in REMOVE_TAGS:
        Tag.objects.get_or_create(name=name)


class Migration(migrations.Migration):

    dependencies = [
        ("comments", "0007_seed_predefined_tags"),
    ]

    operations = [
        migrations.RunPython(remove_qa_tag, restore_qa_tag),
        migrations.AddField(
            model_name="comment",
            name="best_answer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="best_answer_for",
                to="comments.comment",
            ),
        ),
    ]
