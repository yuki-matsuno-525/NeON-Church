from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_add_avatar_to_user"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="bio",
            field=models.TextField(blank=True, default="", max_length=500),
        ),
    ]
