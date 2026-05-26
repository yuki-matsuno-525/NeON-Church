from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("comments", "0009_security_max_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="comment",
            name="title",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
    ]
