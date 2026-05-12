from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("comments", "0008_remove_qa_tag_best_answer"),
    ]

    operations = [
        migrations.AlterField(
            model_name="comment",
            name="body",
            field=models.TextField(max_length=5000),
        ),
    ]
