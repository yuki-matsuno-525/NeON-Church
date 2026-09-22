"""公認本文（TR (GRC)）に残っていた異読の記号 {VAR1: … } {VAR2: … } を取り除く。

取り込み時の処理（import_ibibles.pick_scrivener_reading）と同じく Scrivener 1894 の読みを残す。
取り込みは既存の節を上書きしないので、入っている本文はここで直す。
"""

import re

from django.db import migrations

_VAR1_RE = re.compile(r"\{VAR1:[^}]*\}")
_VAR2_RE = re.compile(r"\{VAR2:\s*([^}]*?)\s*\}")


def pick_scrivener_reading(apps, schema_editor):
    Verse = apps.get_model("bible", "Verse")
    fixed = []
    for verse in Verse.objects.filter(text__contains="{VAR").only("id", "text"):
        text = _VAR1_RE.sub("", verse.text)
        text = _VAR2_RE.sub(lambda m: m.group(1), text)
        verse.text = " ".join(text.split())
        fixed.append(verse)
    Verse.objects.bulk_update(fixed, ["text"], batch_size=500)


class Migration(migrations.Migration):
    dependencies = [
        ("bible", "0005_book_book_translation_order_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(pick_scrivener_reading, migrations.RunPython.noop),
    ]
