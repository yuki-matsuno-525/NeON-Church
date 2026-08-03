"""Regression tests for draft translation data across generic APIs."""

import uuid

import pytest
from rest_framework import status
from rest_framework.test import APIClient


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.fixture
def draft_access(db, book, verse):
    from django.contrib.auth import get_user_model

    from tests.factories import make_comment
    from translations.models import TranslationMembership, TranslationProject, TranslationUnit

    User = get_user_model()
    users = {
        name: User.objects.create_user(
            username=name,
            email=f"{name}@example.com",
            password="test-pass-123",
        )
        for name in ("draft_owner", "approved", "pending", "rejected", "outsider")
    }
    project = TranslationProject.objects.create(
        name="Private draft",
        owner=users["draft_owner"],
        source_book=book,
        target_language="ja",
        status=TranslationProject.STATUS_DRAFT,
    )
    for name, membership_status in (
        ("draft_owner", TranslationMembership.STATUS_APPROVED),
        ("approved", TranslationMembership.STATUS_APPROVED),
        ("pending", TranslationMembership.STATUS_PENDING),
        ("rejected", TranslationMembership.STATUS_REJECTED),
    ):
        TranslationMembership.objects.create(
            project=project,
            user=users[name],
            role=(
                TranslationMembership.ROLE_OWNER
                if name == "draft_owner"
                else TranslationMembership.ROLE_MEMBER
            ),
            status=membership_status,
        )

    published_project = TranslationProject.objects.create(
        name="Published translation",
        owner=users["draft_owner"],
        source_book=book,
        target_language="ja",
        status=TranslationProject.STATUS_PUBLISHED,
    )
    draft_comment = make_comment(
        user=users["draft_owner"],
        verse=verse,
        body="private draft comment",
        translation_project=project,
    )
    rejected_comment = make_comment(
        user=users["rejected"],
        verse=verse,
        body="legacy rejected member comment",
        translation_project=project,
    )
    published_comment = make_comment(
        user=users["draft_owner"],
        verse=verse,
        body="published comment",
        translation_project=published_project,
    )
    unit = TranslationUnit.objects.create(project=project, verse=verse)

    return {
        "users": users,
        "clients": {name: _client(user) for name, user in users.items()},
        "anonymous": _client(),
        "project": project,
        "published_project": published_project,
        "draft_comment": draft_comment,
        "rejected_comment": rejected_comment,
        "published_comment": published_comment,
        "unit": unit,
        "verse": verse,
    }


def _comment_list_url(data, *, published=False):
    project = data["published_project"] if published else data["project"]
    return f"/api/comments/?verse_id={data['verse'].id}&translation_project={project.id}"


@pytest.mark.django_db
class TestDraftGenericCommentVisibility:
    @pytest.mark.parametrize("viewer", ["anonymous", "pending", "rejected", "outsider"])
    def test_hidden_viewers_get_404_from_comment_list(self, draft_access, viewer):
        client = (
            draft_access["anonymous"] if viewer == "anonymous" else draft_access["clients"][viewer]
        )
        response = client.get(_comment_list_url(draft_access))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.parametrize("viewer", ["draft_owner", "approved"])
    def test_owner_and_approved_member_can_list_draft_comments(self, draft_access, viewer):
        response = draft_access["clients"][viewer].get(_comment_list_url(draft_access))
        assert response.status_code == status.HTTP_200_OK
        assert {item["body"] for item in response.data["results"]} == {
            "private draft comment",
            "legacy rejected member comment",
        }

    @pytest.mark.parametrize("viewer", ["pending", "rejected", "outsider"])
    def test_hidden_authenticated_viewers_cannot_post_or_reply(self, draft_access, viewer):
        client = draft_access["clients"][viewer]
        direct = client.post(
            "/api/comments/",
            {
                "verse": str(draft_access["verse"].id),
                "translation_project": str(draft_access["project"].id),
                "body": "not allowed",
            },
            format="json",
        )
        reply = client.post(
            "/api/comments/",
            {
                "verse": str(draft_access["verse"].id),
                "parent": str(draft_access["draft_comment"].id),
                "body": "not allowed reply",
            },
            format="json",
        )
        assert direct.status_code == status.HTTP_404_NOT_FOUND
        assert reply.status_code == status.HTTP_404_NOT_FOUND

    def test_anonymous_post_remains_authentication_protected(self, draft_access):
        response = draft_access["anonymous"].post(
            "/api/comments/",
            {
                "verse": str(draft_access["verse"].id),
                "translation_project": str(draft_access["project"].id),
                "body": "anonymous",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.parametrize("field", ["translation_project", "parent"])
    def test_comment_create_does_not_expose_registered_vs_unknown_uuid(self, draft_access, field):
        hidden_id = (
            draft_access["project"].id
            if field == "translation_project"
            else draft_access["draft_comment"].id
        )
        client = draft_access["clients"]["outsider"]

        def post(target_id):
            return client.post(
                "/api/comments/",
                {
                    "verse": str(draft_access["verse"].id),
                    field: str(target_id),
                    "body": "oracle probe",
                },
                format="json",
            )

        hidden = post(hidden_id)
        unknown = post(uuid.uuid4())
        malformed = post("not-a-uuid")
        assert (
            hidden.status_code
            == unknown.status_code
            == malformed.status_code
            == status.HTTP_404_NOT_FOUND
        )
        assert hidden.data == unknown.data == malformed.data

    def test_comment_list_does_not_expose_registered_vs_unknown_project(self, draft_access):
        client = draft_access["clients"]["outsider"]

        def get(project_id):
            return client.get(
                "/api/comments/",
                {
                    "verse_id": str(draft_access["verse"].id),
                    "translation_project": str(project_id),
                },
            )

        hidden = get(draft_access["project"].id)
        unknown = get(uuid.uuid4())
        malformed = get("not-a-uuid")
        assert (
            hidden.status_code
            == unknown.status_code
            == malformed.status_code
            == status.HTTP_404_NOT_FOUND
        )
        assert hidden.data == unknown.data == malformed.data

    def test_direct_comment_operations_do_not_expose_registered_vs_unknown_uuid(self, draft_access):
        client = draft_access["clients"]["outsider"]
        hidden_id = draft_access["draft_comment"].id
        unknown_id = uuid.uuid4()
        probes = (
            ("post", "upvote/", None),
            ("delete", "upvote/", None),
            ("post", "report/", {"reason": "spam"}),
            ("patch", "", {"body": "changed"}),
            ("delete", "", None),
        )
        for method, suffix, payload in probes:
            request = getattr(client, method)
            hidden_url = f"/api/comments/{hidden_id}/{suffix}"
            unknown_url = f"/api/comments/{unknown_id}/{suffix}"
            if payload is None:
                hidden = request(hidden_url)
                unknown = request(unknown_url)
            else:
                hidden = request(hidden_url, payload, format="json")
                unknown = request(unknown_url, payload, format="json")
            assert hidden.status_code == unknown.status_code == status.HTTP_404_NOT_FOUND
            assert hidden.data == unknown.data

    @pytest.mark.parametrize("viewer", ["draft_owner", "approved"])
    def test_owner_and_approved_member_can_post(self, draft_access, viewer):
        response = draft_access["clients"][viewer].post(
            "/api/comments/",
            {
                "verse": str(draft_access["verse"].id),
                "translation_project": str(draft_access["project"].id),
                "body": f"allowed {viewer}",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED

    @pytest.mark.parametrize("viewer", ["pending", "rejected", "outsider"])
    def test_direct_comment_operations_do_not_reveal_draft(self, draft_access, viewer):
        client = draft_access["clients"][viewer]
        comment_id = draft_access["draft_comment"].id
        assert (
            client.post(f"/api/comments/{comment_id}/upvote/").status_code
            == status.HTTP_404_NOT_FOUND
        )
        assert (
            client.delete(f"/api/comments/{comment_id}/upvote/").status_code
            == status.HTTP_404_NOT_FOUND
        )
        assert (
            client.post(
                f"/api/comments/{comment_id}/report/", {"reason": "spam"}, format="json"
            ).status_code
            == status.HTTP_404_NOT_FOUND
        )
        assert (
            client.patch(
                f"/api/comments/{comment_id}/", {"body": "changed"}, format="json"
            ).status_code
            == status.HTTP_404_NOT_FOUND
        )
        assert (
            client.delete(f"/api/comments/{comment_id}/").status_code == status.HTTP_404_NOT_FOUND
        )

    def test_rejected_author_cannot_edit_or_delete_legacy_comment(self, draft_access):
        client = draft_access["clients"]["rejected"]
        comment_id = draft_access["rejected_comment"].id
        assert (
            client.patch(
                f"/api/comments/{comment_id}/", {"body": "changed"}, format="json"
            ).status_code
            == status.HTTP_404_NOT_FOUND
        )
        assert (
            client.delete(f"/api/comments/{comment_id}/").status_code == status.HTTP_404_NOT_FOUND
        )

    def test_authorized_and_published_comment_operations_still_work(self, draft_access):
        owner = draft_access["clients"]["draft_owner"]
        approved = draft_access["clients"]["approved"]
        comment_id = draft_access["draft_comment"].id
        assert (
            owner.patch(
                f"/api/comments/{comment_id}/", {"body": "owner edit"}, format="json"
            ).status_code
            == status.HTTP_200_OK
        )
        assert (
            approved.post(f"/api/comments/{comment_id}/upvote/").status_code
            == status.HTTP_201_CREATED
        )
        assert (
            approved.post(
                f"/api/comments/{comment_id}/report/", {"reason": "spam"}, format="json"
            ).status_code
            == status.HTTP_201_CREATED
        )

        assert (
            draft_access["anonymous"]
            .get(_comment_list_url(draft_access, published=True))
            .status_code
            == status.HTTP_200_OK
        )
        assert (
            draft_access["clients"]["outsider"]
            .post(
                "/api/comments/",
                {
                    "verse": str(draft_access["verse"].id),
                    "translation_project": str(draft_access["published_project"].id),
                    "body": "public contribution",
                },
                format="json",
            )
            .status_code
            == status.HTTP_201_CREATED
        )


@pytest.mark.django_db
class TestDraftBookmarkVisibility:
    @pytest.mark.parametrize("viewer", ["pending", "rejected", "outsider"])
    @pytest.mark.parametrize("target", ["translation_project", "comment"])
    def test_hidden_viewers_cannot_create_project_or_comment_bookmarks(
        self, draft_access, viewer, target
    ):
        target_id = (
            draft_access["project"].id
            if target == "translation_project"
            else draft_access["draft_comment"].id
        )
        response = draft_access["clients"][viewer].post(
            "/api/bookmarks/", {target: str(target_id)}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.parametrize("viewer", ["draft_owner", "approved"])
    def test_authorized_viewers_can_create_and_list_draft_bookmarks(self, draft_access, viewer):
        client = draft_access["clients"][viewer]
        project_response = client.post(
            "/api/bookmarks/",
            {"translation_project": str(draft_access["project"].id)},
            format="json",
        )
        comment_response = client.post(
            "/api/bookmarks/",
            {"comment": str(draft_access["draft_comment"].id)},
            format="json",
        )
        assert project_response.status_code == status.HTTP_201_CREATED
        assert comment_response.status_code == status.HTTP_201_CREATED
        listing = client.get("/api/bookmarks/")
        assert listing.data["count"] == 2
        assert listing.data["counts"]["project"] == 1
        assert listing.data["counts"]["comment"] == 1
        assert (
            client.delete(f"/api/bookmarks/{project_response.data['id']}/").status_code
            == status.HTTP_204_NO_CONTENT
        )

    def test_hidden_legacy_bookmark_is_not_listed_or_deletable(self, draft_access):
        from bookmarks.models import Bookmark

        user = draft_access["users"]["rejected"]
        bookmark = Bookmark.objects.create(user=user, translation_project=draft_access["project"])
        client = draft_access["clients"]["rejected"]
        listing = client.get("/api/bookmarks/")
        assert listing.data["count"] == 0
        assert listing.data["counts"]["all"] == 0
        hidden = client.delete(f"/api/bookmarks/{bookmark.id}/")
        unknown = client.delete(f"/api/bookmarks/{uuid.uuid4()}/")
        assert hidden.status_code == unknown.status_code == status.HTTP_404_NOT_FOUND
        assert hidden.data == unknown.data

    @pytest.mark.parametrize("field", ["translation_project", "comment"])
    def test_bookmark_create_does_not_expose_registered_vs_unknown_uuid(self, draft_access, field):
        hidden_id = (
            draft_access["project"].id
            if field == "translation_project"
            else draft_access["draft_comment"].id
        )
        client = draft_access["clients"]["outsider"]

        def post(target_id):
            return client.post("/api/bookmarks/", {field: str(target_id)}, format="json")

        hidden = post(hidden_id)
        unknown = post(uuid.uuid4())
        malformed = post("not-a-uuid")
        assert (
            hidden.status_code
            == unknown.status_code
            == malformed.status_code
            == status.HTTP_404_NOT_FOUND
        )
        assert hidden.data == unknown.data == malformed.data

    @pytest.mark.parametrize("viewer", ["anonymous", "pending", "rejected", "outsider"])
    def test_public_bookmarks_hide_draft_targets_but_keep_public_targets(
        self, draft_access, viewer
    ):
        from django.contrib.auth import get_user_model

        from bookmarks.models import Bookmark

        User = get_user_model()
        library_user = User.objects.create_user(
            username=f"public_library_{viewer}",
            password="test-pass-123",
            bookmarks_visibility=User.BOOKMARKS_PUBLIC,
        )
        Bookmark.objects.create(user=library_user, translation_project=draft_access["project"])
        Bookmark.objects.create(user=library_user, comment=draft_access["draft_comment"])
        Bookmark.objects.create(
            user=library_user, translation_project=draft_access["published_project"]
        )
        Bookmark.objects.create(user=library_user, comment=draft_access["published_comment"])
        verse = draft_access["verse"]
        Bookmark.objects.create(
            user=library_user,
            canonical_book=verse.chapter.book.canonical_book,
            chapter_number=verse.chapter.number,
            verse_number=verse.number,
        )

        client = (
            draft_access["anonymous"] if viewer == "anonymous" else draft_access["clients"][viewer]
        )
        response = client.get(f"/api/users/{library_user.username}/bookmarks/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3
        assert response.data["counts"]["all"] == 3
        assert response.data["counts"]["project"] == 1
        assert response.data["counts"]["comment"] == 1
        assert response.data["counts"]["verse"] == 1

    @pytest.mark.parametrize("viewer", ["draft_owner", "approved"])
    def test_public_bookmarks_show_draft_targets_to_authorized_viewers(self, draft_access, viewer):
        from django.contrib.auth import get_user_model

        from bookmarks.models import Bookmark

        User = get_user_model()
        library_user = User.objects.create_user(
            username=f"authorized_library_{viewer}",
            password="test-pass-123",
            bookmarks_visibility=User.BOOKMARKS_PUBLIC,
        )
        Bookmark.objects.create(user=library_user, translation_project=draft_access["project"])
        Bookmark.objects.create(user=library_user, comment=draft_access["draft_comment"])
        response = draft_access["clients"][viewer].get(
            f"/api/users/{library_user.username}/bookmarks/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2


@pytest.mark.django_db
class TestDraftNotificationVisibility:
    def test_generic_project_comment_notification_has_project_target(self, draft_access):
        from notifications.models import Notification

        recipient = draft_access["users"]["draft_owner"]
        notification = Notification.objects.create(
            recipient=recipient,
            actor=draft_access["users"]["approved"],
            notification_type=Notification.REPLY,
            comment=draft_access["draft_comment"],
        )
        response = draft_access["clients"]["draft_owner"].get("/api/notifications/")
        assert response.status_code == status.HTTP_200_OK
        item = next(item for item in response.data["results"] if item["id"] == str(notification.id))
        assert item["target_kind"] == "translation_project_comment"
        assert item["translation_project_id"] == str(draft_access["project"].id)
        assert item["chapter_number"] == draft_access["verse"].chapter.number
        assert item["verse_number"] == draft_access["verse"].number

    def test_generic_project_comment_email_uses_project_reader_target(self, draft_access, settings):
        from django.core import mail

        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        owner = draft_access["users"]["draft_owner"]
        owner.email_notifications_enabled = True
        owner.save(update_fields=["email_notifications_enabled"])
        response = draft_access["clients"]["approved"].post(
            "/api/comments/",
            {
                "verse": str(draft_access["verse"].id),
                "parent": str(draft_access["draft_comment"].id),
                "body": "approved reply",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert len(mail.outbox) == 1
        expected = (
            f"/translations/{draft_access['project'].id}/read/"
            f"{draft_access['verse'].chapter.number}#verse-{draft_access['verse'].number}"
        )
        assert expected in mail.outbox[0].body

    def test_generic_comment_notifications_are_not_sent_to_hidden_recipients(
        self, draft_access, settings
    ):
        from django.core import mail

        from notifications.models import Notification

        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        rejected = draft_access["users"]["rejected"]
        rejected.email_notifications_enabled = True
        rejected.save(update_fields=["email_notifications_enabled"])
        actor = draft_access["clients"]["approved"]
        comment_id = draft_access["rejected_comment"].id

        assert (
            actor.post(f"/api/comments/{comment_id}/upvote/").status_code == status.HTTP_201_CREATED
        )
        assert (
            actor.post(
                "/api/comments/",
                {
                    "verse": str(draft_access["verse"].id),
                    "parent": str(comment_id),
                    "body": "approved reply",
                },
                format="json",
            ).status_code
            == status.HTTP_201_CREATED
        )
        assert not Notification.objects.filter(recipient=draft_access["users"]["rejected"]).exists()
        assert len(mail.outbox) == 0

    def test_unit_mentions_only_notify_users_who_can_view_the_draft(self, draft_access):
        from notifications.models import Notification

        response = draft_access["clients"]["approved"].post(
            f"/api/translations/{draft_access['project'].id}/units/{draft_access['unit'].id}/comments/",
            {"body": ("@draft_owner @approved @pending @rejected @outsider please review")},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        recipients = set(
            Notification.objects.filter(translation_comment__isnull=False).values_list(
                "recipient__username", flat=True
            )
        )
        assert recipients == {"draft_owner"}

    def test_removed_member_cannot_list_count_or_mark_existing_notifications(self, draft_access):
        from notifications.models import Notification
        from translations.models import TranslationComment, TranslationMembership

        approved = draft_access["users"]["approved"]
        actor = draft_access["users"]["draft_owner"]
        translation_comment = TranslationComment.objects.create(
            project=draft_access["project"],
            unit=draft_access["unit"],
            user=actor,
            body="private unit note",
        )
        generic_notification = Notification.objects.create(
            recipient=approved,
            actor=actor,
            notification_type=Notification.REPLY,
            comment=draft_access["draft_comment"],
        )
        translation_notification = Notification.objects.create(
            recipient=approved,
            actor=actor,
            notification_type=Notification.MENTION,
            translation_comment=translation_comment,
        )
        TranslationMembership.objects.filter(
            project=draft_access["project"], user=approved
        ).delete()

        client = draft_access["clients"]["approved"]
        listing = client.get("/api/notifications/")
        assert listing.data["count"] == 0
        assert listing.data["counts"]["all"] == 0
        assert client.get("/api/notifications/unread-count/").data == {"count": 0}
        assert (
            client.post(f"/api/notifications/{generic_notification.id}/read/").status_code
            == status.HTTP_404_NOT_FOUND
        )
        hidden_read = client.post(f"/api/notifications/{translation_notification.id}/read/")
        unknown_read = client.post(f"/api/notifications/{uuid.uuid4()}/read/")
        assert hidden_read.status_code == unknown_read.status_code == status.HTTP_404_NOT_FOUND
        assert hidden_read.data == unknown_read.data
        assert client.post("/api/notifications/read-all/").status_code == status.HTTP_200_OK
        generic_notification.refresh_from_db()
        translation_notification.refresh_from_db()
        assert generic_notification.is_read is False
        assert translation_notification.is_read is False

    def test_rejected_translation_comment_author_cannot_delete_by_id(self, draft_access):
        from translations.models import TranslationComment

        comment = TranslationComment.objects.create(
            project=draft_access["project"],
            unit=draft_access["unit"],
            user=draft_access["users"]["rejected"],
            body="legacy project comment",
        )
        response = draft_access["clients"]["rejected"].delete(
            f"/api/translations/{draft_access['project'].id}/comments/{comment.id}/"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
