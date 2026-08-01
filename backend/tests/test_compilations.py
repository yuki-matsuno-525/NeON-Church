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


def make_verses(count: int):
    book = make_book("Mark", "KJV", 1, slug="mark")
    chapter = Chapter.objects.create(book=book, number=1)
    return [
        Verse.objects.create(chapter=chapter, number=number, text=f"Mark verse {number}.")
        for number in range(1, count + 1)
    ]


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


def make_note_verse(client, book, body):
    res = client.post(
        f"/api/compilations/{book.id}/verses/",
        {"source_kind": "note", "body_snapshot": body},
        format="json",
    )
    assert res.status_code == 201
    return res.data["id"]


def test_new_text_lands_on_top_of_the_tray():
    user = make_user()
    client = authed_client(user)
    book = CompiledBook.objects.create(owner=user, title="Tray order")

    make_note_verse(client, book, "First added.")
    make_note_verse(client, book, "Second added.")
    make_note_verse(client, book, "Third added.")

    tray = client.get(f"/api/compilations/{book.id}/").data["tray"]
    assert [v["body_snapshot"] for v in tray] == ["Third added.", "Second added.", "First added."]


def test_bulk_add_keeps_the_chosen_order_and_lands_on_top():
    user = make_user()
    client = authed_client(user)
    book = CompiledBook.objects.create(owner=user, title="Bulk")
    already_there = make_note_verse(client, book, "already in the box")
    verses = make_verses(3)

    res = client.post(
        f"/api/compilations/{book.id}/verses/bulk/",
        {"source_verses": [str(verses[0].id), str(verses[2].id)]},
        format="json",
    )
    assert res.status_code == 201

    tray = res.data["tray"]
    assert [v["body_snapshot"] for v in tray] == ["Mark verse 1.", "Mark verse 3.", "already in the box"]
    assert [v["order"] for v in tray] == [1, 2, 3]
    assert tray[0]["chapter"] is None
    assert tray[-1]["id"] == already_there


def test_bulk_add_rejects_bad_input_and_other_users():
    owner = make_user("owner")
    other = make_user("other")
    client = authed_client(owner)
    book = CompiledBook.objects.create(owner=owner, title="Bulk guarded")
    verse = make_verses(1)[0]

    assert client.post(f"/api/compilations/{book.id}/verses/bulk/", {"source_verses": []}, format="json").status_code == 400
    assert client.post(
        f"/api/compilations/{book.id}/verses/bulk/",
        {"source_verses": [str(verse.id), str(verse.id)]},
        format="json",
    ).status_code == 400
    assert authed_client(other).post(
        f"/api/compilations/{book.id}/verses/bulk/",
        {"source_verses": [str(verse.id)]},
        format="json",
    ).status_code == 403


def test_reorder_verses_moves_tray_items_into_a_chapter_in_order():
    user = make_user()
    client = authed_client(user)
    book = CompiledBook.objects.create(owner=user, title="Reorder")
    chapter = CompiledChapter.objects.create(book=book, number=1, order=1, title="One")

    first = make_note_verse(client, book, "A")
    second = make_note_verse(client, book, "B")
    kept = make_note_verse(client, book, "C")

    res = client.post(
        f"/api/compilations/{book.id}/verses/reorder/",
        {"chapter": str(chapter.id), "verse_ids": [second, first]},
        format="json",
    )
    assert res.status_code == 200

    verses = res.data["chapters"][0]["verses"]
    assert [v["body_snapshot"] for v in verses] == ["B", "A"]
    assert [v["verse_number"] for v in verses] == [1, 2]
    # 章に移らなかった断章は、ボックスに残って番号が詰まる。
    assert [v["id"] for v in res.data["tray"]] == [kept]
    assert res.data["tray"][0]["order"] == 1
    assert res.data["tray"][0]["verse_number"] is None


def test_reorder_verses_within_a_chapter():
    user = make_user()
    client = authed_client(user)
    book = CompiledBook.objects.create(owner=user, title="Within")
    chapter = CompiledChapter.objects.create(book=book, number=1, order=1, title="One")
    first = make_note_verse(client, book, "A")
    second = make_note_verse(client, book, "B")
    client.post(
        f"/api/compilations/{book.id}/verses/reorder/",
        {"chapter": str(chapter.id), "verse_ids": [first, second]},
        format="json",
    )

    res = client.post(
        f"/api/compilations/{book.id}/verses/reorder/",
        {"chapter": str(chapter.id), "verse_ids": [second, first]},
        format="json",
    )
    assert res.status_code == 200
    assert [v["body_snapshot"] for v in res.data["chapters"][0]["verses"]] == ["B", "A"]


def test_send_verse_back_to_the_tray_renumbers_the_chapter():
    user = make_user()
    client = authed_client(user)
    book = CompiledBook.objects.create(owner=user, title="Back to tray")
    chapter = CompiledChapter.objects.create(book=book, number=1, order=1, title="One")
    first = make_note_verse(client, book, "A")
    second = make_note_verse(client, book, "B")
    third = make_note_verse(client, book, "C")
    client.post(
        f"/api/compilations/{book.id}/verses/reorder/",
        {"chapter": str(chapter.id), "verse_ids": [first, second, third]},
        format="json",
    )

    res = client.patch(
        f"/api/compilations/{book.id}/verses/{first}/",
        {"chapter": None},
        format="json",
    )
    assert res.status_code == 200
    assert res.data["chapter"] is None
    assert res.data["verse_number"] is None

    detail = client.get(f"/api/compilations/{book.id}/").data
    assert [v["id"] for v in detail["tray"]] == [first]
    remaining = detail["chapters"][0]["verses"]
    assert [v["body_snapshot"] for v in remaining] == ["B", "C"]
    assert [v["verse_number"] for v in remaining] == [1, 2]


def test_reorder_chapters():
    user = make_user()
    client = authed_client(user)
    book = CompiledBook.objects.create(owner=user, title="Chapters")
    first = CompiledChapter.objects.create(book=book, number=1, order=1, title="One")
    second = CompiledChapter.objects.create(book=book, number=2, order=2, title="Two")

    res = client.post(
        f"/api/compilations/{book.id}/chapters/reorder/",
        {"chapter_ids": [str(second.id), str(first.id)]},
        format="json",
    )
    assert res.status_code == 200
    assert [c["title"] for c in res.data["chapters"]] == ["Two", "One"]
    assert [c["number"] for c in res.data["chapters"]] == [1, 2]


def test_reorder_rejects_bad_input_and_other_users():
    owner = make_user("owner")
    other = make_user("other")
    client = authed_client(owner)
    book = CompiledBook.objects.create(owner=owner, title="Guarded")
    verse = make_note_verse(client, book, "A")

    assert client.post(
        f"/api/compilations/{book.id}/verses/reorder/",
        {"verse_ids": [verse, verse]},
        format="json",
    ).status_code == 400

    assert client.post(
        f"/api/compilations/{book.id}/chapters/reorder/",
        {"chapter_ids": ["not-a-chapter"]},
        format="json",
    ).status_code == 400

    assert authed_client(other).post(
        f"/api/compilations/{book.id}/verses/reorder/",
        {"verse_ids": [verse]},
        format="json",
    ).status_code == 403


def test_deleting_a_chapter_returns_its_verses_to_the_tray():
    user = make_user()
    client = authed_client(user)
    book = CompiledBook.objects.create(owner=user, title="Delete chapter")
    first = CompiledChapter.objects.create(book=book, number=1, order=1, title="One")
    CompiledChapter.objects.create(book=book, number=2, order=2, title="Two")
    kept_in_tray = make_note_verse(client, book, "stays")
    moved = make_note_verse(client, book, "was in chapter")
    client.post(
        f"/api/compilations/{book.id}/verses/reorder/",
        {"chapter": str(first.id), "verse_ids": [moved]},
        format="json",
    )

    res = client.delete(f"/api/compilations/{book.id}/chapters/{first.id}/")
    assert res.status_code == 204

    detail = client.get(f"/api/compilations/{book.id}/").data
    assert [v["id"] for v in detail["tray"]] == [moved, kept_in_tray]
    assert detail["tray"][0]["verse_number"] is None
    # 残った章は第1章へ詰まる。
    assert [c["number"] for c in detail["chapters"]] == [1]
    assert detail["chapters"][0]["title"] == "Two"


def test_tray_can_be_named():
    user = make_user()
    client = authed_client(user)
    book = CompiledBook.objects.create(owner=user, title="Named tray")

    res = client.patch(f"/api/compilations/{book.id}/", {"tray_name": "拾った断片"}, format="json")
    assert res.status_code == 200
    assert res.data["tray_name"] == "拾った断片"


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
