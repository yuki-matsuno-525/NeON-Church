from django.core import mail
from django.test import override_settings


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_feedback_accepts_anonymous_submission(api_client):
    response = api_client.post(
        "/api/feedback/",
        {
            "category": "bug",
            "email": "reader@example.com",
            "message": "The chapter navigation stopped responding.",
            "page_url": "https://neon-church.com/read/example/1",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json() == {"detail": "Feedback received."}
    assert len(mail.outbox) == 1
    assert "reader@example.com" in mail.outbox[0].body
    assert "chapter navigation" in mail.outbox[0].body


def test_feedback_validates_message_and_category(api_client):
    response = api_client.post(
        "/api/feedback/",
        {"category": "unknown", "message": "short"},
        format="json",
    )

    assert response.status_code == 400
    assert "category" in response.json()
    assert "message" in response.json()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_feedback_honeypot_rejects_bot_submission(api_client):
    response = api_client.post(
        "/api/feedback/",
        {
            "category": "feedback",
            "message": "This is long enough to be accepted.",
            "website": "https://spam.example",
        },
        format="json",
    )

    assert response.status_code == 400
    assert mail.outbox == []
