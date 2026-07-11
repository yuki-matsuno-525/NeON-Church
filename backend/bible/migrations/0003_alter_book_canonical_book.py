"""Book.canonical_book を NOT NULL 化する（段階3D）。

前提: 段階3B で全既存環境の Book を CanonicalBook にリンク済み（未リンク0）、
段階3C で Book を作る全経路が canonical を必ず設定する。既存 NULL 行は無いため、
一度きりの default を持たせる必要はなく、AlterField（SET NOT NULL）のみで足りる。
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bible", "0002_canonicalbook_book_canonical_book"),
    ]

    operations = [
        migrations.AlterField(
            model_name="book",
            name="canonical_book",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="editions",
                to="bible.canonicalbook",
            ),
        ),
    ]
