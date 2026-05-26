import pytest
from rest_framework import status

from tests.conftest import REGISTER_URL

COMMENTS_URL = "/api/comments/"
NOTIFICATIONS_URL = "/api/notifications/"


def upvote_url(comment_id):
    return f"/api/comments/{comment_id}/upvote/"


def read_url(notification_id):
    return f"/api/notifications/{notification_id}/read/"


READ_ALL_URL = "/api/notifications/read-all/"
UNREAD_COUNT_URL = "/api/notifications/unread-count/"


@pytest.fixture
def other_auth_client(db, other_user_payload):
    """別ユーザーの独立したクライアント。"""
    from rest_framework.test import APIClient
    client = APIClient()
    client.post(REGISTER_URL, other_user_payload, format="json")
    return client


@pytest.fixture
def comment(db, auth_client, verse):
    """auth_client ユーザーが投稿したトップレベルコメント。"""
    res = auth_client.post(
        COMMENTS_URL,
        {"verse": str(verse.id), "body": "テストコメント"},
        format="json",
    )
    return res.data


# ------------------------------------------------------------------
# 通知作成トリガー
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestNotificationTrigger:
    def test_reply_creates_notification(self, auth_client, other_auth_client, comment, verse):
        """他ユーザーが返信すると auth_client ユーザーに通知が届く。"""
        other_auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "返信", "parent": comment["id"]},
            format="json",
        )
        res = auth_client.get(NOTIFICATIONS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["notification_type"] == "reply"
        assert res.data["results"][0]["actor_username"] == "otheruser"

    def test_self_reply_does_not_create_notification(self, auth_client, comment, verse):
        """自分への返信は通知されない。"""
        auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "自己返信", "parent": comment["id"]},
            format="json",
        )
        res = auth_client.get(NOTIFICATIONS_URL)
        assert res.data["count"] == 0

    def test_upvote_creates_notification(self, auth_client, other_auth_client, comment):
        """他ユーザーが upvote すると auth_client ユーザーに通知が届く。"""
        other_auth_client.post(upvote_url(comment["id"]))
        res = auth_client.get(NOTIFICATIONS_URL)
        assert res.data["count"] == 1
        assert res.data["results"][0]["notification_type"] == "upvote"
        assert res.data["results"][0]["actor_username"] == "otheruser"

    def test_self_upvote_does_not_create_notification(self, auth_client, comment):
        """自分への upvote は通知されない。"""
        auth_client.post(upvote_url(comment["id"]))
        res = auth_client.get(NOTIFICATIONS_URL)
        assert res.data["count"] == 0


# ------------------------------------------------------------------
# 通知一覧
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestNotificationList:
    def test_anonymous_cannot_list(self, api_client):
        res = api_client.get(NOTIFICATIONS_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_only_own_notifications_returned(self, auth_client, other_auth_client, comment):
        """他ユーザーの通知は見えない。"""
        auth_client.post(upvote_url(comment["id"]))  # other_auth_client への通知はない
        res = other_auth_client.get(NOTIFICATIONS_URL)
        assert res.data["count"] == 0

    def test_unread_filter(self, auth_client, other_auth_client, comment, verse):
        """?unread=1 で未読のみ返る。"""
        # 通知を1件作成
        other_auth_client.post(upvote_url(comment["id"]))
        # 既読にする
        notifications = auth_client.get(NOTIFICATIONS_URL).data["results"]
        auth_client.post(read_url(notifications[0]["id"]))
        # 未読フィルタ
        res = auth_client.get(NOTIFICATIONS_URL, {"unread": "1"})
        assert res.data["count"] == 0

    def test_comment_body_snippet_shown(self, auth_client, other_auth_client, comment):
        other_auth_client.post(upvote_url(comment["id"]))
        res = auth_client.get(NOTIFICATIONS_URL)
        assert res.data["results"][0]["comment_body_snippet"] == "テストコメント"


# ------------------------------------------------------------------
# 既読
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestNotificationRead:
    def test_mark_as_read(self, auth_client, other_auth_client, comment):
        other_auth_client.post(upvote_url(comment["id"]))
        notification_id = auth_client.get(NOTIFICATIONS_URL).data["results"][0]["id"]
        res = auth_client.post(read_url(notification_id))
        assert res.status_code == status.HTTP_200_OK
        # is_read が True になっていることを確認
        updated = auth_client.get(NOTIFICATIONS_URL).data["results"][0]
        assert updated["is_read"] is True

    def test_cannot_read_others_notification(self, auth_client, other_auth_client, comment, verse):
        """他ユーザーの通知を既読にできない（404）。"""
        other_auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "返信", "parent": comment["id"]},
            format="json",
        )
        notification_id = auth_client.get(NOTIFICATIONS_URL).data["results"][0]["id"]
        # other_auth_client が auth_client の通知を既読にしようとする
        res = other_auth_client.post(read_url(notification_id))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_read_all(self, auth_client, other_auth_client, comment, verse):
        """read-all で全通知が既読になる。"""
        other_auth_client.post(upvote_url(comment["id"]))
        other_auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "返信", "parent": comment["id"]},
            format="json",
        )
        res = auth_client.post(READ_ALL_URL)
        assert res.status_code == status.HTTP_200_OK
        unread = auth_client.get(NOTIFICATIONS_URL, {"unread": "1"}).data
        assert unread["count"] == 0


# ------------------------------------------------------------------
# target_kind / book_name / chapter_number / verse_number
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestNotificationTarget:
    def test_verse_comment_reply_target_fields(self, auth_client, other_auth_client, comment, verse):
        """節コメントへの返信通知に target_kind=verse_comment と書名/章番号/節番号が含まれる。"""
        other_auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "返信", "parent": comment["id"]},
            format="json",
        )
        n = auth_client.get(NOTIFICATIONS_URL).data["results"][0]
        assert n["target_kind"] == "verse_comment"
        assert n["book_name"] == verse.chapter.book.name
        assert n["chapter_number"] == verse.chapter.number
        assert n["verse_number"] == verse.number
        assert n["is_qa"] is False

    def test_upvote_on_verse_comment_target_fields(self, auth_client, other_auth_client, comment, verse):
        """upvote 通知でも root の verse 情報が target になる。"""
        other_auth_client.post(upvote_url(comment["id"]))
        n = auth_client.get(NOTIFICATIONS_URL).data["results"][0]
        assert n["target_kind"] == "verse_comment"
        assert n["book_name"] == verse.chapter.book.name
        assert n["verse_number"] == verse.number

    def test_qa_reply_target_kind_is_qa(self, auth_client, other_auth_client, verse):
        """is_qa=True のコメントへの返信は target_kind=qa を返す。"""
        qa = auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "質問", "is_qa": True, "title": "通知テスト質問"},
            format="json",
        ).data
        reply = other_auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "回答", "parent": qa["id"]},
            format="json",
        ).data
        n = auth_client.get(NOTIFICATIONS_URL).data["results"][0]
        assert n["target_kind"] == "qa"
        assert n["is_qa"] is True
        # comment_id は通知トリガーになった返信側、root の質問は target_kind=qa の文脈で扱う
        assert n["comment_id"] == reply["id"]


# ------------------------------------------------------------------
# 未読件数 API
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestNotificationUnreadCount:
    def test_anonymous_cannot_get(self, api_client):
        res = api_client.get(UNREAD_COUNT_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_zero_when_no_notifications(self, auth_client):
        res = auth_client.get(UNREAD_COUNT_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data == {"count": 0}

    def test_counts_only_unread_and_own(self, auth_client, other_auth_client, comment, verse):
        # auth_client への通知を 2 件作る
        other_auth_client.post(upvote_url(comment["id"]))
        other_auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "返信", "parent": comment["id"]},
            format="json",
        )
        # other_auth_client にはまだ通知がない
        assert other_auth_client.get(UNREAD_COUNT_URL).data == {"count": 0}
        assert auth_client.get(UNREAD_COUNT_URL).data == {"count": 2}
        # 1 件既読化すると 1 件減る
        first = auth_client.get(NOTIFICATIONS_URL).data["results"][0]
        auth_client.post(read_url(first["id"]))
        assert auth_client.get(UNREAD_COUNT_URL).data == {"count": 1}
