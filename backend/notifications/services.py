from django.conf import settings
from django.core.mail import send_mail

from translations.access import can_view_project_work
from .models import Notification


_EMAIL_ACTIONS = {
    Notification.REPLY: "replied to your comment",
    Notification.UPVOTE: "upvoted your comment",
    Notification.MENTION: "mentioned you in a translation discussion",
}


def _root_comment(comment):
    while comment.parent_id:
        comment = comment.parent
    return comment


def _notification_target_path(*, comment=None, translation_comment=None) -> str:
    """Build a user-safe frontend destination without relying on a notification row."""
    if translation_comment is not None:
        suffix = f"#unit-{translation_comment.unit_id}" if translation_comment.unit_id else ""
        return f"/translations/{translation_comment.project_id}{suffix}"

    if comment is None:
        return "/notifications"

    root = _root_comment(comment)
    if root.translation_project_id:
        base = f"/translations/{root.translation_project_id}/read"
        if root.chapter_number is None:
            return f"{base}#chapter-comments"
        if root.verse_number is None:
            return f"{base}/{root.chapter_number}#chapter-comments"
        return f"{base}/{root.chapter_number}#verse-{root.verse_number}"
    if root.is_qa:
        return f"/qa#question-{root.id}"
    if not root.canonical_book_id:
        return "/notifications"

    book_path = f"/{root.canonical_book.slug}"
    if root.chapter_number is None:
        return f"{book_path}#chapter-comments"
    chapter_path = f"{book_path}/{root.chapter_number}"
    if root.verse_number is not None:
        return f"{chapter_path}#verse-{root.verse_number}"
    return f"{chapter_path}#chapter-comments"


def send_user_notification(
    *,
    recipient,
    actor,
    notification_type: str,
    comment=None,
    translation_comment=None,
) -> Notification | None:
    """Deliver one user notification through each channel the recipient enabled."""
    if recipient == actor:
        return None

    project = None
    if translation_comment is not None:
        project = translation_comment.project
    elif comment is not None and comment.translation_project_id:
        project = comment.translation_project
    if project is not None and not can_view_project_work(recipient, project):
        return None

    notification = None
    if recipient.in_app_notifications_enabled:
        notification = Notification.objects.create(
            recipient=recipient,
            actor=actor,
            notification_type=notification_type,
            comment=comment,
            translation_comment=translation_comment,
        )

    if recipient.email_notifications_enabled and recipient.email:
        action = _EMAIL_ACTIONS.get(notification_type, "sent you a notification")
        target_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}"
            f"{_notification_target_path(comment=comment, translation_comment=translation_comment)}"
        )
        send_mail(
            f"NeON Church: {actor.username} {action}",
            f"{actor.username} {action}.\n\nView it:\n{target_url}",
            getattr(settings, "DEFAULT_FROM_EMAIL", None),
            [recipient.email],
            fail_silently=True,
        )

    return notification
