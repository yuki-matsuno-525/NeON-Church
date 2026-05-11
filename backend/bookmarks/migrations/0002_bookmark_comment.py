import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookmarks", "0001_initial"),
        ("comments", "0004_add_chapter_book_to_comment"),
    ]

    operations = [
        migrations.AlterField(
            model_name="bookmark",
            name="verse",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="bookmarks",
                to="bible.verse",
            ),
        ),
        migrations.AddField(
            model_name="bookmark",
            name="comment",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="bookmarks",
                to="comments.comment",
            ),
        ),
        migrations.RemoveConstraint(
            model_name="bookmark",
            name="unique_user_verse_bookmark",
        ),
        migrations.AddConstraint(
            model_name="bookmark",
            constraint=models.UniqueConstraint(
                condition=models.Q(verse__isnull=False),
                fields=["user", "verse"],
                name="unique_user_verse_bookmark",
            ),
        ),
        migrations.AddConstraint(
            model_name="bookmark",
            constraint=models.UniqueConstraint(
                condition=models.Q(comment__isnull=False),
                fields=["user", "comment"],
                name="unique_user_comment_bookmark",
            ),
        ),
    ]
