from datetime import datetime

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings

from common import clock


@override_settings(APPLICATION_REFERENCE_TIME="2026-08-02T12:00:00+09:00")
def test_reference_time_is_returned_as_an_aware_datetime():
    assert clock.now() == datetime.fromisoformat("2026-08-02T12:00:00+09:00")
    assert clock.localdate().isoformat() == "2026-08-02"


@pytest.mark.parametrize("value", ["not-a-time", "2026-08-02T12:00:00"])
def test_invalid_or_naive_reference_time_fails_closed(value):
    with override_settings(APPLICATION_REFERENCE_TIME=value):
        with pytest.raises(ImproperlyConfigured, match="DJANGO_REFERENCE_TIME"):
            clock.now()
