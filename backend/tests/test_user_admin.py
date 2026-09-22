"""管理画面から荒らしを利用停止にできること。"""

import pytest
from django.contrib.admin.sites import site

from users.admin import UserAdmin
from users.models import User

pytestmark = pytest.mark.django_db


def test_user_is_registered_in_admin():
    assert isinstance(site._registry[User], UserAdmin)


def test_deactivate_action_skips_staff(rf, admin_user):
    member = User.objects.create_user(username="member", password="pw-123456!")
    staff = User.objects.create_user(username="staff", password="pw-123456!", is_staff=True)
    request = rf.post("/")
    request.user = admin_user
    model_admin = site._registry[User]
    model_admin.message_user = lambda *args, **kwargs: None

    model_admin.deactivate_users(request, User.objects.filter(pk__in=[member.pk, staff.pk]))

    member.refresh_from_db()
    staff.refresh_from_db()
    assert member.is_active is False
    assert staff.is_active is True


def test_admin_user_list_page_opens(client, admin_user):
    client.force_login(admin_user)
    res = client.get("/admin/users/user/")
    assert res.status_code == 200
