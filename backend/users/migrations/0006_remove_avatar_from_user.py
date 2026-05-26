from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0005_social_account"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="avatar",
        ),
    ]
