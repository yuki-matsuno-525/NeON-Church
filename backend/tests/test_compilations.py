import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from bible.models import Chapter, Verse
from compilations.models import CompiledBook, CompiledChapter, CompiledComment, CompiledVerse
from tests.factories import make_book


pytestmark = pytest.mark.django_db


def make_user(username="editor"):
    return get_user_model().objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="Passw0rd!123",
    )


def make_verse():
    book = make_book("John", "KJV", 1, slug="john")
    chapter = Chapter.objects.create(book=book, number=1)
    return Verse.objects.create(chapter=chapter, number=1, text="In the beginning was the Word.")


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_create_compiled_book_and_add_bible_verse_to_tray():
    user = make_user()
    verse = make_verse()
    client = authed_client(user)

    res = client.post(
        "/api/compilations/",
        {
            "title": "A Book Outside the Institution",
            "description": "A draft path of reading.",
            "annotation": "Read this as a temporary gathering.",
            "motif_names": ["Non-Church", "Word"],
        },
        format="json",
    )
    assert res.status_code == 201
    book_id = res.data["id"]

    res = client.post(
        f"/api/compilations/{book_id}/verses/",
        {
            "source_verse": str(verse.id),
            "curator_note": "A source placed before any institution.",
        },
        format="json",
    )
    assert res.status_code == 201
    assert res.data["body_snapshot"] == verse.text
    assert res.data["chapter"] is None
    assert "John 1:1" in res.data["source_label"]

    detail = client.get(f"/api/compilations/{book_id}/")
    assert detail.status_code == 200
    assert len(detail.data["tray"]) == 1
    assert detail.data["motif_tags"][0]["name"] == "Non-Church"


def test_add_plain_text_and_move_it_into_chapter():
    user = make_user()
    client = authed_client(user)
    book = CompiledBook.objects.create(owner=user, title="Plain Text Book")

    chapter_res = client.post(
        f"/api/compilations/{book.id}/chapters/",
        {
            "title": "A chapter of gathered fragments",
            "introduction": "The chapter opens with a new sentence.",
            "annotation": "This chapter is experimental.",
        },
        format="json",
    )
    assert chapter_res.status_code == 201
    chapter_id = chapter_res.data["id"]

    verse_res = client.post(
        f"/api/compilations/{book.id}/verses/",
        {
            "source_kind": "note",
            "body_snapshot": "This is a plain sentence added by the compiler.",
            "curator_note": "This note explains why it stands here.",
        },
        format="json",
    )
    assert verse_res.status_code == 201
    compiled_verse_id = verse_res.data["id"]

    move_res = client.patch(
        f"/api/compilations/{book.id}/verses/{compiled_verse_id}/",
        {"chapter": chapter_id},
        format="json",
    )
    assert move_res.status_code == 200
    assert str(move_res.data["chapter"]) == chapter_id
    assert move_res.data["verse_number"] == 1


def test_private_and_public_visibility_rules():
    owner = make_user("owner")
    other = make_user("other")
    private_book = CompiledBook.objects.create(owner=owner, title="Private Draft")
    public_book = CompiledBook.objects.create(
        owner=owner,
        title="Published Book",
        visibility=CompiledBook.VISIBILITY_PUBLIC,
    )

    anon = APIClient()
    assert anon.get(f"/api/compilations/{private_book.id}/").status_code == 403
    assert anon.get(f"/api/compilations/{public_book.id}/").status_code == 200

    other_client = authed_client(other)
    assert other_client.patch(
        f"/api/compilations/{private_book.id}/",
        {"title": "Hijack"},
        format="json",
    ).status_code == 403


def test_compiled_book_chapter_and_verse_comments():
    user = make_user()
    client = authed_client(user)
    book = CompiledBook.objects.create(
        owner=user,
        title="Commentable Book",
        visibility=CompiledBook.VISIBILITY_PUBLIC,
    )
    chapter = CompiledChapter.objects.create(book=book, number=1, order=1, title="Chapter")
    verse = CompiledVerse.objects.create(
        book=book,
        chapter=chapter,
        verse_number=1,
        order=1,
        source_kind=CompiledVerse.SOURCE_NOTE,
        body_snapshot="A compiled sentence.",
        source_label="Original note",
    )

    for payload in (
        {"book": str(book.id), "body": "Book-level comment."},
        {"chapter": str(chapter.id), "body": "Chapter-level comment."},
        {"verse": str(verse.id), "body": "Verse-level comment."},
    ):
        res = client.post("/api/compilations/comments/", payload, format="json")
        assert res.status_code == 201

    assert CompiledComment.objects.count() == 3
    list_res = APIClient().get(f"/api/compilations/comments/?verse={verse.id}")
    assert list_res.status_code == 200
    assert list_res.data["results"][0]["body"] == "Verse-level comment."
