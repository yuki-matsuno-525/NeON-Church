"""Application clock with an explicit reference-time seam for deterministic runs."""

from datetime import date, datetime

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone


def now() -> datetime:
    """Return the application time, optionally fixed by an aware ISO-8601 value."""
    raw_reference = getattr(settings, "APPLICATION_REFERENCE_TIME", "")
    if not raw_reference:
        return timezone.now()

    try:
        reference = datetime.fromisoformat(raw_reference)
    except ValueError as error:
        raise ImproperlyConfigured(
            "DJANGO_REFERENCE_TIME must be an ISO-8601 datetime with a UTC offset."
        ) from error
    if timezone.is_naive(reference):
        raise ImproperlyConfigured(
            "DJANGO_REFERENCE_TIME must include an explicit UTC offset."
        )
    return reference


def localdate() -> date:
    """Return the date for the current Django timezone using the application clock."""
    return timezone.localdate(now())
