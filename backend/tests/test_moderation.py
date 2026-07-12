import pytest
from rest_framework import status

from tests.conftest import REGISTER_URL

COMMENTS_URL = "/api/comments/"


def report_url(comment_id):
    return f"/api/comments/{comment_id}/report/"


def moderate_url(comment_id):
    return f"/api/comments/{comment_id}/moderate/"


@pytest.fixture
def other_auth_client(db, other_user_payload):
    from rest_framework.test import APIClient
    client = APIClient()
    client.post(REGISTER_URL, other_user_payload, format="json")
    return client


@pytest.fixture
def admin_client(db):
    """is_staff=True の管理者クライアント。"""
    from django.contrib.auth import get_user_model
    from rest_framework.test import APIClient
    User = get_user_model()
    user = User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="adminpass",
        is_staff=True,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def comment(db, auth_client, verse):
    res = auth_client.post(
        COMMENTS_URL,
        {"verse": str(verse.id), "body": "テストコメント"},
        format="json",
    )
    return res.data


# ------------------------------------------------------------------
# 通報
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestReport:
    def test_authenticated_can_report(self, other_auth_client, comment):
        res = other_auth_client.post(report_url(comment["id"]), {"reason": "spam"}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["reason"] == "spam"

    def test_anonymous_cannot_report(self, api_client, comment):
        res = api_client.post(report_url(comment["id"]), {"reason": "spam"}, format="json")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_duplicate_report_is_409(self, other_auth_client, comment):
        other_auth_client.post(report_url(comment["id"]), {"reason": "spam"}, format="json")
        res = other_auth_client.post(report_url(comment["id"]), {"reason": "offensive"}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT

    def test_invalid_reason_is_400(self, other_auth_client, comment):
        res = other_auth_client.post(report_url(comment["id"]), {"reason": "invalid"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_report_saved_to_db(self, other_auth_client, comment):
        from comments.models import Report
        other_auth_client.post(report_url(comment["id"]), {"reason": "spam"}, format="json")
        assert Report.objects.filter(comment_id=comment["id"]).count() == 1

    def test_cannot_report_own_comment(self, auth_client, comment):
        """自分のコメントは通報できない。"""
        res = auth_client.post(report_url(comment["id"]), {"reason": "spam"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST


# ------------------------------------------------------------------
# 管理者強制削除
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestAdminModerate:
    def test_admin_can_moderate(self, admin_client, comment):
        res = admin_client.delete(moderate_url(comment["id"]))
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_moderate_sets_is_deleted(self, admin_client, comment):
        from comments.models import Comment
        admin_client.delete(moderate_url(comment["id"]))
        assert Comment.objects.get(id=comment["id"]).is_deleted is True

    def test_regular_user_cannot_moderate(self, auth_client, comment):
        res = auth_client.delete(moderate_url(comment["id"]))
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_moderate(self, api_client, comment):
        res = api_client.delete(moderate_url(comment["id"]))
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_can_moderate_others_comment(self, admin_client, other_auth_client, verse):
        """管理者は他ユーザーのコメントも削除できる。"""
        res = other_auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "問題のあるコメント"},
            format="json",
        )
        assert admin_client.delete(moderate_url(res.data["id"])).status_code == status.HTTP_204_NO_CONTENT

    def test_moderate_already_deleted_is_idempotent(self, admin_client, comment):
        """削除済みコメントへの moderate は冪等（204 を返す）。"""
        admin_client.delete(moderate_url(comment["id"]))
        res = admin_client.delete(moderate_url(comment["id"]))
        assert res.status_code == status.HTTP_204_NO_CONTENT


# ------------------------------------------------------------------
# レートリミット
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestThrottle:
    def test_comment_create_throttle(self, monkeypatch, auth_client, verse):
        # SimpleRateThrottle.THROTTLE_RATES はクラス定義時に1度だけ評価されるため、
        # settings 経由では変更が反映されない。クラス属性を直接差し替える。
        from rest_framework.throttling import SimpleRateThrottle
        monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", {
            "comment_create": "1/min",
            "report": "5/min",
            "auth": "5/min",
        })
        auth_client.post(COMMENTS_URL, {"verse": str(verse.id), "body": "1"}, format="json")
        res = auth_client.post(COMMENTS_URL, {"verse": str(verse.id), "body": "2"}, format="json")
        assert res.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_report_throttle(self, monkeypatch, other_auth_client, comment, db, verse):
        from rest_framework.throttling import SimpleRateThrottle
        from tests.factories import make_comment
        monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", {
            "comment_create": "10/min",
            "report": "1/min",
            "auth": "5/min",
        })
        # 別コメントを DB に直接作成して異なるコメントへ2件目の通報を試みる
        import django.contrib.auth
        User = django.contrib.auth.get_user_model()
        reporter = User.objects.get(username="otheruser")
        owner = User.objects.get(username="testuser")
        second_comment = make_comment(user=owner, verse=verse, body="2件目通報対象")
        other_auth_client.post(report_url(comment["id"]), {"reason": "spam"}, format="json")
        res = other_auth_client.post(report_url(str(second_comment.id)), {"reason": "offensive"}, format="json")
        assert res.status_code == status.HTTP_429_TOO_MANY_REQUESTS
