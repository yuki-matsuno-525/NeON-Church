import pytest
from rest_framework import status

from tests.conftest import REGISTER_URL

COMMENTS_URL = "/api/comments/"


def comment_url(comment_id):
    return f"/api/comments/{comment_id}/"


# ------------------------------------------------------------------
# フィクスチャ
# ------------------------------------------------------------------
@pytest.fixture
def other_auth_client(db, other_user_payload):
    """別ユーザーの独立したクライアント。"""
    from rest_framework.test import APIClient
    client = APIClient()
    client.post(REGISTER_URL, other_user_payload, format="json")
    return client


@pytest.fixture
def comment(db, auth_client, verse):
    """auth_client ユーザーが投稿したコメント。"""
    res = auth_client.post(
        COMMENTS_URL,
        {"verse": str(verse.id), "body": "テストコメント"},
        format="json",
    )
    return res.data


# ------------------------------------------------------------------
# コメント投稿
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestCommentCreate:
    def test_authenticated_can_post(self, auth_client, verse):
        res = auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "テストコメント"},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["body"] == "テストコメント"
        assert res.data["user"]["username"] == "testuser"
        assert res.data["is_deleted"] is False

    def test_anonymous_cannot_post(self, api_client, verse):
        res = api_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "テストコメント"},
            format="json",
        )
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_reply_to_comment(self, auth_client, verse, comment):
        res = auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "返信コメント", "parent": comment["id"]},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert str(res.data["parent"]) == comment["id"]

    def test_reply_to_different_verse_is_rejected(self, auth_client, verse, comment, chapter):
        from bible.models import Verse
        other_verse = Verse.objects.create(chapter=chapter, number=2, text="別の節")
        res = auth_client.post(
            COMMENTS_URL,
            {"verse": str(other_verse.id), "body": "不正な返信", "parent": comment["id"]},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_chapter_comment_post(self, auth_client, chapter):
        res = auth_client.post(
            COMMENTS_URL,
            {"chapter": str(chapter.id), "body": "章コメント"},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert str(res.data["chapter"]) == str(chapter.id)
        assert res.data["verse"] is None

    def test_book_comment_post(self, auth_client, book):
        res = auth_client.post(
            COMMENTS_URL,
            {"book": str(book.id), "body": "書コメント"},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert str(res.data["book"]) == str(book.id)
        assert res.data["verse"] is None

    def test_multiple_targets_rejected(self, auth_client, verse, chapter):
        res = auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "chapter": str(chapter.id), "body": "不正"},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_no_target_rejected(self, auth_client):
        res = auth_client.post(
            COMMENTS_URL,
            {"body": "ターゲットなし"},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_chapter_reply_chain(self, auth_client, chapter):
        """章コメントへの返信の返信（depth≥2）が正しく保存されることを確認。"""
        res1 = auth_client.post(
            COMMENTS_URL,
            {"chapter": str(chapter.id), "body": "トップコメント"},
            format="json",
        )
        res2 = auth_client.post(
            COMMENTS_URL,
            {"chapter": str(chapter.id), "body": "返信", "parent": res1.data["id"]},
            format="json",
        )
        res3 = auth_client.post(
            COMMENTS_URL,
            {"chapter": str(chapter.id), "body": "返信の返信", "parent": res2.data["id"]},
            format="json",
        )
        assert res3.status_code == status.HTTP_201_CREATED
        assert str(res3.data["parent"]) == res2.data["id"]


# ------------------------------------------------------------------
# コメント一覧
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestCommentList:
    def test_filter_by_verse(self, api_client, comment, verse):
        res = api_client.get(COMMENTS_URL, {"verse_id": str(verse.id)})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1

    def test_no_filter_returns_empty(self, api_client, comment):
        res = api_client.get(COMMENTS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 0

    def test_filter_by_chapter_id(self, api_client, auth_client, chapter):
        auth_client.post(
            COMMENTS_URL,
            {"chapter": str(chapter.id), "body": "章コメント"},
            format="json",
        )
        res = api_client.get(COMMENTS_URL, {"chapter_id": str(chapter.id)})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1

    def test_filter_by_book_id(self, api_client, auth_client, book):
        auth_client.post(
            COMMENTS_URL,
            {"book": str(book.id), "body": "書コメント"},
            format="json",
        )
        res = api_client.get(COMMENTS_URL, {"book_id": str(book.id)})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1

    def test_verse_comments_not_in_chapter_filter(self, api_client, auth_client, verse, chapter):
        """節コメントが章コメントフィルタに混入しないことを確認。"""
        auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "節コメント"},
            format="json",
        )
        res = api_client.get(COMMENTS_URL, {"chapter_id": str(chapter.id)})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 0

    def test_anonymous_can_read(self, api_client, comment, verse):
        res = api_client.get(COMMENTS_URL, {"verse_id": str(verse.id)})
        assert res.status_code == status.HTTP_200_OK

    def test_deleted_comment_body_is_masked(self, auth_client, comment, verse):
        auth_client.delete(comment_url(comment["id"]))
        res = auth_client.get(COMMENTS_URL, {"verse_id": str(verse.id)})
        assert res.data[0]["body"] == "このコメントは削除されました"
        assert res.data[0]["is_deleted"] is True


# ------------------------------------------------------------------
# 論理削除
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestCommentDelete:
    def test_owner_can_delete(self, auth_client, comment):
        res = auth_client.delete(comment_url(comment["id"]))
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_other_user_cannot_delete(self, other_auth_client, comment):
        res = other_auth_client.delete(comment_url(comment["id"]))
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_delete(self, api_client, comment):
        res = api_client.delete(comment_url(comment["id"]))
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_soft_delete_keeps_record_in_db(self, auth_client, comment):
        from comments.models import Comment
        auth_client.delete(comment_url(comment["id"]))
        # 物理削除されていないことを確認
        assert Comment.objects.filter(id=comment["id"]).exists()
        assert Comment.objects.get(id=comment["id"]).is_deleted is True


# ------------------------------------------------------------------
# Upvote
# ------------------------------------------------------------------
def upvote_url(comment_id):
    return f"/api/comments/{comment_id}/upvote/"


@pytest.mark.django_db
class TestCommentUpvote:
    def test_authenticated_can_upvote(self, auth_client, comment):
        res = auth_client.post(upvote_url(comment["id"]))
        assert res.status_code == status.HTTP_201_CREATED

    def test_anonymous_cannot_upvote(self, api_client, comment):
        res = api_client.post(upvote_url(comment["id"]))
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_duplicate_upvote_is_409(self, auth_client, comment):
        auth_client.post(upvote_url(comment["id"]))
        res = auth_client.post(upvote_url(comment["id"]))
        assert res.status_code == status.HTTP_409_CONFLICT

    def test_remove_upvote(self, auth_client, comment):
        auth_client.post(upvote_url(comment["id"]))
        res = auth_client.delete(upvote_url(comment["id"]))
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_remove_upvote_not_voted_is_404(self, auth_client, comment):
        res = auth_client.delete(upvote_url(comment["id"]))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_vote_count_increments(self, auth_client, other_auth_client, comment, verse):
        auth_client.post(upvote_url(comment["id"]))
        other_auth_client.post(upvote_url(comment["id"]))
        res = auth_client.get(COMMENTS_URL, {"verse_id": str(verse.id)})
        assert res.data[0]["vote_count"] == 2

    def test_vote_count_decrements_after_remove(self, auth_client, comment, verse):
        auth_client.post(upvote_url(comment["id"]))
        auth_client.delete(upvote_url(comment["id"]))
        res = auth_client.get(COMMENTS_URL, {"verse_id": str(verse.id)})
        assert res.data[0]["vote_count"] == 0

    def test_ordering_by_votes(self, auth_client, other_auth_client, verse):
        """vote が多いコメントが先頭に来ることを確認。"""
        # コメント A（0 票）とコメント B（1 票）を作成
        res_a = auth_client.post(COMMENTS_URL, {"verse": str(verse.id), "body": "A"}, format="json")
        res_b = auth_client.post(COMMENTS_URL, {"verse": str(verse.id), "body": "B"}, format="json")
        other_auth_client.post(upvote_url(res_b.data["id"]))

        res = auth_client.get(COMMENTS_URL, {"verse_id": str(verse.id), "ordering": "votes"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data[0]["id"] == res_b.data["id"]
        assert res.data[1]["id"] == res_a.data["id"]


# ------------------------------------------------------------------
# コメント編集
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestCommentUpdate:
    def test_owner_can_edit(self, auth_client, comment):
        res = auth_client.patch(
            comment_url(comment["id"]),
            {"body": "編集後のテキスト"},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data["body"] == "編集後のテキスト"

    def test_other_user_cannot_edit(self, other_auth_client, comment):
        res = other_auth_client.patch(
            comment_url(comment["id"]),
            {"body": "不正編集"},
            format="json",
        )
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_edit(self, api_client, comment):
        res = api_client.patch(
            comment_url(comment["id"]),
            {"body": "不正編集"},
            format="json",
        )
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cannot_edit_deleted_comment(self, auth_client, comment):
        auth_client.delete(comment_url(comment["id"]))
        res = auth_client.patch(
            comment_url(comment["id"]),
            {"body": "削除済みを編集"},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_empty_body_rejected(self, auth_client, comment):
        res = auth_client.patch(
            comment_url(comment["id"]),
            {"body": "   "},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST
