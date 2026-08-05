import pytest
from rest_framework import status

BOOKMARKS_URL = "/api/bookmarks/"


def bookmark_url(bookmark_id):
    return f"/api/bookmarks/{bookmark_id}/"


@pytest.fixture
def other_auth_client(db, other_user_payload):
    from rest_framework.test import APIClient

    from tests.conftest import REGISTER_URL

    client = APIClient()
    client.post(REGISTER_URL, other_user_payload, format="json")
    return client


@pytest.fixture
def bookmark(db, auth_client, verse):
    res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
    return res.data


@pytest.fixture
def comment(db, auth_client, verse):
    from django.contrib.auth import get_user_model

    from tests.factories import make_comment

    User = get_user_model()
    user = User.objects.get(username="testuser")
    return make_comment(user=user, verse=verse, body="テストコメント")


# ------------------------------------------------------------------
# お気に入り追加
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBookmarkCreate:
    def test_authenticated_can_bookmark(self, auth_client, verse):
        res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["target_type"] == "verse"
        assert res.data["reference"]["verse"] == verse.number

    def test_anonymous_cannot_bookmark(self, api_client, verse):
        res = api_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_duplicate_bookmark_is_409(self, auth_client, verse, bookmark):
        res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT

    def test_verse_bookmark_stores_canonical_location(self, auth_client, verse):
        # 段階5F: verse_id 入力から箇所（canonical_book/章番号/節番号）が backend 導出で保存される
        res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        from bookmarks.models import Bookmark

        bm = Bookmark.objects.get()
        assert bm.canonical_book.slug == "matthew"
        assert bm.chapter_number == verse.chapter.number
        assert bm.verse_number == verse.number

    def test_comment_bookmark_has_null_location(self, auth_client, comment):
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        from bookmarks.models import Bookmark

        bm = Bookmark.objects.get(comment=comment)
        assert bm.canonical_book_id is None
        assert bm.chapter_number is None
        assert bm.verse_number is None

    def test_same_location_other_translation_is_409(self, auth_client, verse):
        # 口語訳マタイ1:1 をお気に入りに追加 → 同じ箇所の KJV 版 Verse は 409（別訳でも同一箇所は二重不可）
        from bible.models import Chapter, Verse
        from bookmarks.models import Bookmark
        from tests.factories import make_book

        assert (
            auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json").status_code
            == 201
        )

        kjv = make_book("Matthew", "KJV", 1, slug="matthew")
        kjv_ch = Chapter.objects.create(book=kjv, number=verse.chapter.number)
        kjv_verse = Verse.objects.create(
            chapter=kjv_ch, number=verse.number, text="For God so loved"
        )

        res = auth_client.post(BOOKMARKS_URL, {"verse": str(kjv_verse.id)}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT
        # 失敗時に不完全な Bookmark を残さない（最初の1件だけ）
        assert Bookmark.objects.count() == 1

    def test_different_location_can_bookmark(self, auth_client, verse):
        # 同じ書の別の節（2:1）は別箇所なので登録できる
        from bible.models import Chapter, Verse

        assert (
            auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json").status_code
            == 201
        )
        ch2 = Chapter.objects.create(book=verse.chapter.book, number=2)
        v2 = Verse.objects.create(chapter=ch2, number=1, text="x")

        res = auth_client.post(BOOKMARKS_URL, {"verse": str(v2.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED

    def test_comment_bookmark_not_blocked_by_verse_location(self, auth_client, verse, comment):
        # 同じ箇所に節のお気に入りがあっても、その節へのコメントのお気に入りは作成できる
        auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED

    def test_verse_bookmark_response_includes_reference(self, auth_client, verse):
        # 段階5D: レスポンスに訳非依存の箇所 reference が入る
        res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.data["reference"] == {
            "book": "matthew",
            "chapter": verse.chapter.number,
            "verse": verse.number,
        }

    def test_comment_bookmark_reference_is_null(self, auth_client, comment):
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        assert res.data["reference"] is None


# ------------------------------------------------------------------
# お気に入り一覧
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBookmarkList:
    def test_authenticated_can_list(self, auth_client, bookmark):
        res = auth_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1

    def test_anonymous_cannot_list(self, api_client, bookmark):
        res = api_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_only_own_bookmarks_are_returned(self, auth_client, other_auth_client, verse, bookmark):
        """他ユーザーのお気に入りは見えない。"""
        res = other_auth_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 0

    def test_reference_is_included(self, auth_client, bookmark, verse):
        res = auth_client.get(BOOKMARKS_URL)
        ref = res.data["results"][0]["reference"]
        assert ref["book"] == "matthew"
        assert ref["chapter"] == verse.chapter.number
        assert ref["verse"] == verse.number

    def test_verse_bookmark_list_includes_verse_text(self, auth_client, bookmark, verse):
        # 一覧では表示用に節本文（verse_text）を返す（プロフィールで内容が分かるようにするため）。
        res = auth_client.get(BOOKMARKS_URL)
        item = res.data["results"][0]
        assert item["target_type"] == "verse"
        assert item["verse_text"] == verse.text


# ------------------------------------------------------------------
# お気に入り削除
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBookmarkDelete:
    def test_owner_can_delete(self, auth_client, bookmark):
        res = auth_client.delete(bookmark_url(bookmark["id"]))
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_other_user_cannot_delete(self, other_auth_client, bookmark):
        res = other_auth_client.delete(bookmark_url(bookmark["id"]))
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_delete(self, api_client, bookmark):
        res = api_client.delete(bookmark_url(bookmark["id"]))
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_removes_record(self, auth_client, bookmark):
        from bookmarks.models import Bookmark

        auth_client.delete(bookmark_url(bookmark["id"]))
        assert not Bookmark.objects.filter(id=bookmark["id"]).exists()


# ------------------------------------------------------------------
# コメントのお気に入り
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestCommentBookmark:
    def test_can_bookmark_comment(self, auth_client, comment):
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["target_type"] == "comment"
        assert res.data["comment_detail"]["id"] == str(comment.id)

    def test_duplicate_comment_bookmark_is_409(self, auth_client, comment):
        auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT

    def test_comment_bookmark_appears_in_list(self, auth_client, comment):
        auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        res = auth_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["target_type"] == "comment"

    def test_empty_body_is_rejected(self, auth_client):
        res = auth_client.post(BOOKMARKS_URL, {}, format="json")
        assert res.status_code in (
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_409_CONFLICT,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    def test_can_delete_comment_bookmark(self, auth_client, comment):
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        bm_id = res.data["id"]
        del_res = auth_client.delete(bookmark_url(bm_id))
        assert del_res.status_code == status.HTTP_204_NO_CONTENT


# ------------------------------------------------------------------
# 章・書のお気に入り（粒度）
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestLocationGranularityBookmark:
    def test_can_bookmark_chapter(self, auth_client, chapter):
        res = auth_client.post(BOOKMARKS_URL, {"chapter": str(chapter.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["target_type"] == "chapter"
        assert res.data["reference"] == {
            "book": "matthew",
            "chapter": chapter.number,
            "verse": None,
        }

    def test_can_bookmark_book(self, auth_client, book):
        res = auth_client.post(BOOKMARKS_URL, {"book": str(book.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["target_type"] == "book"
        assert res.data["reference"] == {
            "book": "matthew",
            "chapter": None,
            "verse": None,
        }

    def test_chapter_stores_null_verse(self, auth_client, chapter):
        auth_client.post(BOOKMARKS_URL, {"chapter": str(chapter.id)}, format="json")
        from bookmarks.models import Bookmark

        bm = Bookmark.objects.get()
        assert bm.canonical_book.slug == "matthew"
        assert bm.chapter_number == chapter.number
        assert bm.verse_number is None

    def test_duplicate_chapter_is_409(self, auth_client, chapter):
        auth_client.post(BOOKMARKS_URL, {"chapter": str(chapter.id)}, format="json")
        res = auth_client.post(BOOKMARKS_URL, {"chapter": str(chapter.id)}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT

    def test_chapter_and_verse_coexist(self, auth_client, verse, chapter):
        # 節のお気に入りと章のお気に入りは別粒度なので両方付けられる
        assert (
            auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json").status_code
            == 201
        )
        res = auth_client.post(BOOKMARKS_URL, {"chapter": str(chapter.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED

    def test_chapter_bookmark_has_no_verse_text(self, auth_client, chapter):
        auth_client.post(BOOKMARKS_URL, {"chapter": str(chapter.id)}, format="json")
        res = auth_client.get(BOOKMARKS_URL)
        item = res.data["results"][0]
        assert item["target_type"] == "chapter"
        assert item["verse_text"] is None


# ------------------------------------------------------------------
# 翻訳プロジェクトのお気に入り
# ------------------------------------------------------------------
@pytest.fixture
def project(db, book):
    from django.contrib.auth import get_user_model

    from translations.models import TranslationProject

    User = get_user_model()
    owner = User.objects.create_user(username="proj_owner", password="pass12345")
    return TranslationProject.objects.create(
        name="エノク書 私訳",
        owner=owner,
        source_book=book,
        target_language="ja",
        status=TranslationProject.STATUS_PUBLISHED,
    )


@pytest.mark.django_db
class TestProjectBookmark:
    def test_can_bookmark_project(self, auth_client, project):
        res = auth_client.post(
            BOOKMARKS_URL, {"translation_project": str(project.id)}, format="json"
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["target_type"] == "project"
        assert res.data["project_detail"]["id"] == str(project.id)
        assert res.data["project_detail"]["name"] == "エノク書 私訳"

    def test_project_reference_is_null(self, auth_client, project):
        res = auth_client.post(
            BOOKMARKS_URL, {"translation_project": str(project.id)}, format="json"
        )
        assert res.data["reference"] is None

    def test_duplicate_project_is_409(self, auth_client, project):
        auth_client.post(BOOKMARKS_URL, {"translation_project": str(project.id)}, format="json")
        res = auth_client.post(
            BOOKMARKS_URL, {"translation_project": str(project.id)}, format="json"
        )
        assert res.status_code == status.HTTP_409_CONFLICT

    def test_project_bookmark_appears_in_list(self, auth_client, project):
        auth_client.post(BOOKMARKS_URL, {"translation_project": str(project.id)}, format="json")
        res = auth_client.get(BOOKMARKS_URL)
        assert res.data["count"] == 1
        assert res.data["results"][0]["target_type"] == "project"

    def test_can_delete_project_bookmark(self, auth_client, project):
        res = auth_client.post(
            BOOKMARKS_URL, {"translation_project": str(project.id)}, format="json"
        )
        del_res = auth_client.delete(bookmark_url(res.data["id"]))
        assert del_res.status_code == status.HTTP_204_NO_CONTENT


# ------------------------------------------------------------------
# 種類での絞り込みとタブ件数
#
# 一覧には節・章・書・コメント・翻訳企画の5種が混ざるため、画面はタブで切り替える。
# その材料になる ?type= と counts を検証する。
# ------------------------------------------------------------------
@pytest.fixture
def one_of_each_type(auth_client, verse, chapter, book, comment, project):
    """5種類のお気に入りを1件ずつ作る。粒度が違うので節・章・書は共存できる。"""
    auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
    auth_client.post(BOOKMARKS_URL, {"chapter": str(chapter.id)}, format="json")
    auth_client.post(BOOKMARKS_URL, {"book": str(book.id)}, format="json")
    auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
    auth_client.post(BOOKMARKS_URL, {"translation_project": str(project.id)}, format="json")


@pytest.mark.django_db
class TestBookmarkTypeFilter:
    def test_counts_are_returned_per_type(self, auth_client, one_of_each_type):
        res = auth_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["counts"] == {
            "all": 5,
            "verse": 1,
            "chapter": 1,
            "book": 1,
            "comment": 1,
            "project": 1,
        }

    @pytest.mark.parametrize("target_type", ["verse", "chapter", "book", "comment", "project"])
    def test_filter_returns_only_that_type(self, auth_client, one_of_each_type, target_type):
        res = auth_client.get(BOOKMARKS_URL, {"type": target_type})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["target_type"] == target_type

    def test_no_type_returns_all(self, auth_client, one_of_each_type):
        res = auth_client.get(BOOKMARKS_URL)
        assert res.data["count"] == 5

    def test_unknown_type_falls_back_to_all(self, auth_client, one_of_each_type):
        # 古い URL を開いても一覧が空にならないよう、未知の値では絞らない。
        res = auth_client.get(BOOKMARKS_URL, {"type": "nonsense"})
        assert res.data["count"] == 5

    def test_counts_ignore_the_type_filter(self, auth_client, one_of_each_type):
        # タブの数字は「絞り込み前の全体」なので、絞っても変わらない。
        res = auth_client.get(BOOKMARKS_URL, {"type": "verse"})
        assert res.data["count"] == 1
        assert res.data["counts"]["all"] == 5

    def test_counts_exclude_other_users(self, other_auth_client, one_of_each_type):
        res = other_auth_client.get(BOOKMARKS_URL)
        assert res.data["counts"]["all"] == 0

    def test_chapter_filter_excludes_verse_and_book(self, auth_client, one_of_each_type):
        # 節・章・書は同じ canonical_book を指すので、条件がずれると互いに混ざる。
        res = auth_client.get(BOOKMARKS_URL, {"type": "chapter"})
        ref = res.data["results"][0]["reference"]
        assert ref["chapter"] is not None
        assert ref["verse"] is None


# ------------------------------------------------------------------
# 箇所での絞り込み（読書画面用）
#
# 読書画面は「今開いている章のお気に入り」しか要らない。以前は全件取ってから絞っていたので、
# お気に入りが増えるほど章を開くのが遅くなっていた。サーバー側で絞れることを検証する。
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBookmarkLocationFilter:
    def test_chapter_scope_returns_chapter_verse_and_comment_bookmarks(
        self, auth_client, one_of_each_type
    ):
        # 章のページで使う3種（章のお気に入り・節のお気に入り・その章のコメントへのお気に入り）がまとめて返る。
        res = auth_client.get(BOOKMARKS_URL, {"book": "matthew", "chapter": 1})
        assert res.status_code == status.HTTP_200_OK
        kinds = {item["target_type"] for item in res.data["results"]}
        assert kinds == {"verse", "chapter", "comment"}

    def test_chapter_scope_excludes_book_and_project(self, auth_client, one_of_each_type):
        res = auth_client.get(BOOKMARKS_URL, {"book": "matthew", "chapter": 1})
        kinds = {item["target_type"] for item in res.data["results"]}
        assert "book" not in kinds
        assert "project" not in kinds

    def test_other_chapter_returns_nothing(self, auth_client, one_of_each_type):
        res = auth_client.get(BOOKMARKS_URL, {"book": "matthew", "chapter": 2})
        assert res.data["count"] == 0

    def test_book_scope_returns_only_book_bookmark(self, auth_client, one_of_each_type):
        # 書のページは書のお気に入りだけを使う。節のお気に入り・章のお気に入りまで返すと件数が増えて元の木阿弥になる。
        res = auth_client.get(BOOKMARKS_URL, {"book": "matthew"})
        assert res.data["count"] == 1
        assert res.data["results"][0]["target_type"] == "book"

    def test_project_scope_returns_only_that_project(self, auth_client, one_of_each_type, project):
        res = auth_client.get(BOOKMARKS_URL, {"translation_project": str(project.id)})
        assert res.data["count"] == 1
        assert res.data["results"][0]["target_type"] == "project"

    def test_location_scope_omits_counts(self, auth_client, one_of_each_type):
        # 箇所で絞ったときはタブを出さないので、件数集計の往復を省いている。
        res = auth_client.get(BOOKMARKS_URL, {"book": "matthew", "chapter": 1})
        assert "counts" not in res.data

    def test_other_users_bookmarks_are_not_leaked(self, other_auth_client, one_of_each_type):
        res = other_auth_client.get(BOOKMARKS_URL, {"book": "matthew", "chapter": 1})
        assert res.data["count"] == 0
