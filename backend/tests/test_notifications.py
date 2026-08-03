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

    def test_disabled_in_app_preference_skips_comment_notification(
        self, auth_client, other_auth_client, comment
    ):
        from django.contrib.auth import get_user_model

        recipient = get_user_model().objects.get(username="testuser")
        recipient.in_app_notifications_enabled = False
        recipient.save(update_fields=["in_app_notifications_enabled"])

        other_auth_client.post(upvote_url(comment["id"]))

        assert auth_client.get(NOTIFICATIONS_URL).data["count"] == 0

    def test_email_preference_delivers_comment_notification(
        self, auth_client, other_auth_client, comment, settings
    ):
        from django.contrib.auth import get_user_model
        from django.core import mail

        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        recipient = get_user_model().objects.get(username="testuser")
        recipient.in_app_notifications_enabled = False
        recipient.email_notifications_enabled = True
        recipient.save(update_fields=["in_app_notifications_enabled", "email_notifications_enabled"])

        other_auth_client.post(upvote_url(comment["id"]))

        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [recipient.email]
        assert "/matthew/1#verse-1" in mail.outbox[0].body
        assert auth_client.get(NOTIFICATIONS_URL).data["count"] == 0


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

    def test_body_snippet_shown(self, auth_client, other_auth_client, comment):
        other_auth_client.post(upvote_url(comment["id"]))
        res = auth_client.get(NOTIFICATIONS_URL)
        assert res.data["results"][0]["body_snippet"] == "テストコメント"


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

    def test_upvote_on_verse_comment_target_fields(self, auth_client, other_auth_client, comment, verse):
        """upvote 通知でも root の verse 情報が target になる。"""
        other_auth_client.post(upvote_url(comment["id"]))
        n = auth_client.get(NOTIFICATIONS_URL).data["results"][0]
        assert n["target_kind"] == "verse_comment"
        assert n["book_name"] == verse.chapter.book.name
        assert n["verse_number"] == verse.number

    def test_qa_answer_target_fields(self, auth_client, other_auth_client, verse):
        """Q&A の回答が付くと、質問した人に target_kind=qa の通知が届く。"""
        question = auth_client.post(
            "/api/qa/questions/",
            {"title": "通知テスト質問", "body": "質問", "verse": str(verse.id)},
            format="json",
        ).data
        other_auth_client.post(
            "/api/qa/answers/", {"question": question["id"], "body": "回答"}, format="json"
        )
        n = auth_client.get(NOTIFICATIONS_URL).data["results"][0]
        assert n["target_kind"] == "qa"
        # フロントはこの id で /qa/{question_id} を組み立てる
        assert n["question_id"] == question["id"]
        assert n["body_snippet"] == "回答"
        # 箇所は質問から取る（回答自身は箇所を持たない）
        assert n["book_name"] == verse.chapter.book.name
        assert n["verse_number"] == verse.number

    def test_no_notification_for_self_answer(self, auth_client, verse):
        """自分の質問に自分で答えたときは通知しない。"""
        question = auth_client.post(
            "/api/qa/questions/",
            {"title": "自問自答", "body": "質問", "verse": str(verse.id)},
            format="json",
        ).data
        auth_client.post(
            "/api/qa/answers/", {"question": question["id"], "body": "自分で回答"}, format="json"
        )
        assert auth_client.get(NOTIFICATIONS_URL).data["count"] == 0


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


# ------------------------------------------------------------------
# 種類での絞り込みとタブ件数
#
# 返信・高評価・メンションが1本に混ざると、数の多い高評価に返信が埋もれる。
# 画面はタブで切り替えるので、その材料になる ?type= と counts を検証する。
# ------------------------------------------------------------------
@pytest.fixture
def mixed_notifications(db, auth_client, comment):
    """受信者(testuser)宛に 返信2件 / 高評価1件 / メンション1件 を作る。"""
    from django.contrib.auth import get_user_model

    from notifications.models import Notification
    User = get_user_model()
    recipient = User.objects.get(username="testuser")
    actor = User.objects.create_user(username="notif_actor", password="pass12345")

    for notification_type, times in (
        (Notification.REPLY, 2),
        (Notification.UPVOTE, 1),
        (Notification.MENTION, 1),
    ):
        for _ in range(times):
            Notification.objects.create(
                recipient=recipient, actor=actor, notification_type=notification_type
            )


@pytest.mark.django_db
class TestNotificationTypeFilter:
    def test_counts_are_returned_per_type(self, auth_client, mixed_notifications):
        res = auth_client.get(NOTIFICATIONS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["counts"] == {"all": 4, "reply": 2, "upvote": 1, "mention": 1}

    @pytest.mark.parametrize("target_type,expected", [("reply", 2), ("upvote", 1), ("mention", 1)])
    def test_filter_returns_only_that_type(self, auth_client, mixed_notifications, target_type, expected):
        res = auth_client.get(NOTIFICATIONS_URL, {"type": target_type})
        assert res.data["count"] == expected
        assert {n["notification_type"] for n in res.data["results"]} == {target_type}

    def test_unknown_type_falls_back_to_all(self, auth_client, mixed_notifications):
        res = auth_client.get(NOTIFICATIONS_URL, {"type": "nonsense"})
        assert res.data["count"] == 4

    def test_counts_ignore_the_type_filter(self, auth_client, mixed_notifications):
        res = auth_client.get(NOTIFICATIONS_URL, {"type": "reply"})
        assert res.data["count"] == 2
        assert res.data["counts"]["all"] == 4

    def test_counts_follow_the_unread_filter(self, auth_client, mixed_notifications):
        # 未読タブを見ているときは、種類ごとの数字も未読だけを数える。
        first = auth_client.get(NOTIFICATIONS_URL, {"type": "reply"}).data["results"][0]
        auth_client.post(read_url(first["id"]))
        res = auth_client.get(NOTIFICATIONS_URL, {"unread": "1"})
        assert res.data["counts"] == {"all": 3, "reply": 1, "upvote": 1, "mention": 1}

    def test_type_and_unread_combine(self, auth_client, mixed_notifications):
        first = auth_client.get(NOTIFICATIONS_URL, {"type": "reply"}).data["results"][0]
        auth_client.post(read_url(first["id"]))
        res = auth_client.get(NOTIFICATIONS_URL, {"type": "reply", "unread": "1"})
        assert res.data["count"] == 1

    def test_counts_exclude_other_users(self, other_auth_client, mixed_notifications):
        res = other_auth_client.get(NOTIFICATIONS_URL)
        assert res.data["counts"]["all"] == 0


# ------------------------------------------------------------------
# 一覧の問い合わせ回数
#
# 通知は「返信の返信」でも元の箇所へ飛ばすため、スレッドの根まで親をたどる。
# これを1件につき5か所（種別・書名・章・節・Q&Aか）から呼んでいたため、
# 20件のページで100〜200回の問い合わせになっていた。
# ------------------------------------------------------------------
@pytest.fixture
def nested_reply_notifications(db, auth_client, comment, verse):
    """深さ2の返信スレッドを作り、その返信への通知を10件ぶら下げる。"""
    from django.contrib.auth import get_user_model

    from notifications.models import Notification
    from tests.factories import make_comment

    User = get_user_model()
    recipient = User.objects.get(username="testuser")
    actor = User.objects.create_user(username="deep_actor", password="pass12345")

    from comments.models import Comment

    parent = Comment.objects.get(pk=comment["id"])
    for i in range(10):
        child = make_comment(user=actor, verse=verse, body=f"返信{i}", parent=parent)
        grandchild = make_comment(user=actor, verse=verse, body=f"返信の返信{i}", parent=child)
        Notification.objects.create(
            recipient=recipient,
            actor=actor,
            notification_type=Notification.REPLY,
            comment=grandchild,
        )


@pytest.mark.django_db
class TestNotificationListQueryCount:
    def test_query_count_does_not_grow_with_notifications(
        self, auth_client, nested_reply_notifications, django_assert_max_num_queries
    ):
        with django_assert_max_num_queries(12):
            res = auth_client.get(NOTIFICATIONS_URL)
        assert res.data["count"] == 10

    def test_nested_reply_still_points_at_the_original_passage(
        self, auth_client, nested_reply_notifications, verse
    ):
        # まとめて引くようにしても、飛び先（書名・章・節）は変わらない。
        item = auth_client.get(NOTIFICATIONS_URL).data["results"][0]
        assert item["target_kind"] == "verse_comment"
        assert item["book_name"] == verse.chapter.book.name
        assert item["chapter_number"] == verse.chapter.number
        assert item["verse_number"] == verse.number
