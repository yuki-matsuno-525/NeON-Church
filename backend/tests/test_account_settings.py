from urllib.parse import parse_qs, urlparse

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework import status
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

SETTINGS_URL = "/api/auth/settings/"
IDENTITY_URL = "/api/auth/settings/identity/"
PREFERENCES_URL = "/api/auth/settings/preferences/"
PASSWORD_URL = "/api/auth/settings/password/"
SESSIONS_URL = "/api/auth/settings/sessions/"
REVOKE_OTHERS_URL = "/api/auth/settings/sessions/revoke-others/"
ACCOUNT_URL = "/api/auth/settings/account/"
RESET_REQUEST_URL = "/api/auth/password-reset/"
RESET_CONFIRM_URL = "/api/auth/password-reset/confirm/"

User = get_user_model()


@pytest.fixture
def password_reset_settings(settings):
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.FRONTEND_URL = "https://frontend.example"


@pytest.mark.django_db
class TestAccountSettings:
    def test_get_returns_preferences_and_auth_method(self, auth_client):
        response = auth_client.get(SETTINGS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email_notifications_enabled"] is False
        assert response.data["in_app_notifications_enabled"] is True
        assert response.data["has_usable_password"] is True
        assert response.data["social_providers"] == []

    def test_requires_authentication(self, api_client):
        assert api_client.get(SETTINGS_URL).status_code == status.HTTP_401_UNAUTHORIZED

    def test_identity_update_requires_current_password(self, auth_client, user_payload):
        response = auth_client.patch(
            IDENTITY_URL,
            {
                "username": "renamed",
                "email": "renamed@example.com",
                "current_password": "wrong-password",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert User.objects.get(email=user_payload["email"]).username == user_payload["username"]

    def test_identity_update_changes_username_and_email(self, auth_client, user_payload):
        response = auth_client.patch(
            IDENTITY_URL,
            {
                "username": "renamed",
                "email": "Renamed@Example.com",
                "current_password": user_payload["password"],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "renamed"
        assert response.data["email"] == "renamed@example.com"

    def test_identity_update_enforces_case_insensitive_uniqueness(self, auth_client, user_payload):
        User.objects.create_user(username="TakenName", email="taken@example.com", password="pass12345")

        username_response = auth_client.patch(
            IDENTITY_URL,
            {"username": "takenname", "current_password": user_payload["password"]},
            format="json",
        )
        email_response = auth_client.patch(
            IDENTITY_URL,
            {"email": "TAKEN@example.com", "current_password": user_payload["password"]},
            format="json",
        )

        assert username_response.status_code == status.HTTP_400_BAD_REQUEST
        assert email_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_updates_notification_preferences(self, auth_client):
        response = auth_client.patch(
            PREFERENCES_URL,
            {"email_notifications_enabled": False, "in_app_notifications_enabled": False},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "email_notifications_enabled": False,
            "in_app_notifications_enabled": False,
        }


@pytest.mark.django_db
class TestPasswordAndSessions:
    def test_password_change_invalidates_old_refresh_and_issues_new_pair(self, auth_client, user_payload):
        old_refresh = auth_client.cookies["refresh_token"].value

        response = auth_client.post(
            PASSWORD_URL,
            {
                "current_password": user_payload["password"],
                "new_password": "NewStrongPass123!",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.cookies["refresh_token"].value != old_refresh
        assert User.objects.get(username=user_payload["username"]).check_password("NewStrongPass123!")
        auth_client.cookies["refresh_token"] = old_refresh
        assert auth_client.post("/api/auth/token/refresh/").status_code == status.HTTP_401_UNAUTHORIZED

    def test_password_change_rejects_wrong_current_password(self, auth_client):
        response = auth_client.post(
            PASSWORD_URL,
            {"current_password": "wrong-password", "new_password": "NewStrongPass123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_lists_and_revokes_an_individual_session(self, auth_client):
        user = User.objects.get(username="testuser")
        extra_refresh = RefreshToken.for_user(user)

        sessions = auth_client.get(SESSIONS_URL)
        extra_id = str(extra_refresh["jti"])
        assert sessions.status_code == status.HTTP_200_OK
        assert len(sessions.data) == 2
        assert sum(item["current"] for item in sessions.data) == 1

        response = auth_client.delete(f"{SESSIONS_URL}{extra_id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        token = OutstandingToken.objects.get(jti=extra_id)
        assert BlacklistedToken.objects.filter(token=token).exists()

    def test_revoke_other_sessions_keeps_current_session(self, auth_client):
        user = User.objects.get(username="testuser")
        RefreshToken.for_user(user)
        RefreshToken.for_user(user)

        response = auth_client.post(REVOKE_OTHERS_URL)
        sessions = auth_client.get(SESSIONS_URL)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert len(sessions.data) == 1
        assert sessions.data[0]["current"] is True


@pytest.mark.django_db
class TestAccountDeletion:
    def test_requires_matching_username_and_password(self, auth_client, user_payload):
        mismatch = auth_client.delete(
            ACCOUNT_URL,
            {"username": "someone-else", "password": user_payload["password"]},
            format="json",
        )
        wrong_password = auth_client.delete(
            ACCOUNT_URL,
            {"username": user_payload["username"], "password": "wrong-password"},
            format="json",
        )

        assert mismatch.status_code == status.HTTP_400_BAD_REQUEST
        assert wrong_password.status_code == status.HTTP_400_BAD_REQUEST
        assert User.objects.filter(username=user_payload["username"]).exists()

    def test_deletes_account_and_clears_cookies(self, auth_client, user_payload):
        response = auth_client.delete(
            ACCOUNT_URL,
            {"username": user_payload["username"], "password": user_payload["password"]},
            format="json",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert response.cookies["access_token"].value == ""
        assert response.cookies["refresh_token"].value == ""
        assert not User.objects.filter(username=user_payload["username"]).exists()

    def test_oauth_only_account_does_not_require_password(self, auth_client, user_payload):
        user = User.objects.get(username=user_payload["username"])
        user.set_unusable_password()
        user.save(update_fields=["password"])

        response = auth_client.delete(
            ACCOUNT_URL,
            {"username": user_payload["username"]},
            format="json",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestPasswordReset:
    def test_request_does_not_disclose_account_existence(self, api_client, user_payload, password_reset_settings):
        User.objects.create_user(**user_payload)

        known = api_client.post(RESET_REQUEST_URL, {"email": user_payload["email"]}, format="json")
        unknown = api_client.post(RESET_REQUEST_URL, {"email": "missing@example.com"}, format="json")

        assert known.status_code == status.HTTP_200_OK
        assert unknown.status_code == status.HTTP_200_OK
        assert known.data == unknown.data
        assert len(mail.outbox) == 1
        assert "https://frontend.example/reset-password?" in mail.outbox[0].body

    def test_delivery_failure_does_not_disclose_account_existence(
        self, api_client, user_payload, password_reset_settings, monkeypatch
    ):
        User.objects.create_user(**user_payload)

        def fail_delivery(*args, **kwargs):
            raise RuntimeError("SMTP unavailable")

        monkeypatch.setattr("users.views.send_mail", fail_delivery)
        known = api_client.post(RESET_REQUEST_URL, {"email": user_payload["email"]}, format="json")
        unknown = api_client.post(RESET_REQUEST_URL, {"email": "missing@example.com"}, format="json")

        assert known.status_code == status.HTTP_200_OK
        assert unknown.status_code == status.HTTP_200_OK
        assert known.data == unknown.data

    def test_confirm_resets_password_and_token_cannot_be_reused(self, api_client, user_payload, password_reset_settings):
        user = User.objects.create_user(**user_payload)
        old_refresh = RefreshToken.for_user(user)
        api_client.post(RESET_REQUEST_URL, {"email": user_payload["email"]}, format="json")
        reset_url = next(line for line in mail.outbox[0].body.splitlines() if line.startswith("https://"))
        query = parse_qs(urlparse(reset_url).query)
        payload = {
            "uid": query["uid"][0],
            "token": query["token"][0],
            "new_password": "ResetStrongPass123!",
        }

        response = api_client.post(RESET_CONFIRM_URL, payload, format="json")
        reused = api_client.post(RESET_CONFIRM_URL, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert reused.status_code == status.HTTP_400_BAD_REQUEST
        assert User.objects.get(username=user_payload["username"]).check_password("ResetStrongPass123!")
        outstanding = OutstandingToken.objects.get(jti=str(old_refresh["jti"]))
        assert BlacklistedToken.objects.filter(token=outstanding).exists()

    def test_confirm_rejects_invalid_link(self, api_client):
        response = api_client.post(
            RESET_CONFIRM_URL,
            {"uid": "invalid", "token": "invalid", "new_password": "ResetStrongPass123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
