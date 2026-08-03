import uuid

import pytest
from rest_framework import status

LIST_URL = "/api/translations/"


def detail_url(project_id):
    return f"/api/translations/{project_id}/"


def activate_url(project_id):
    return f"/api/translations/{project_id}/activate/"


def publish_url(project_id):
    return f"/api/translations/{project_id}/publish/"


def unpublish_url(project_id):
    return f"/api/translations/{project_id}/unpublish/"


def join_url(project_id):
    return f"/api/translations/{project_id}/join/"


def members_url(project_id):
    return f"/api/translations/{project_id}/members/"


def member_detail_url(project_id, membership_id):
    return f"/api/translations/{project_id}/members/{membership_id}/"


def units_url(project_id):
    return f"/api/translations/{project_id}/units/"


def unit_detail_url(project_id, unit_id):
    return f"/api/translations/{project_id}/units/{unit_id}/"


def unit_assign_url(project_id, unit_id):
    return f"/api/translations/{project_id}/units/{unit_id}/assign/"


def comments_url(project_id):
    return f"/api/translations/{project_id}/comments/"


def unit_comments_url(project_id, unit_id):
    return f"/api/translations/{project_id}/units/{unit_id}/comments/"


def comment_delete_url(project_id, comment_id):
    return f"/api/translations/{project_id}/comments/{comment_id}/"


def read_url(project_id):
    return f"/api/translations/{project_id}/read/"


REGISTER_URL = "/api/auth/register/"


# ---------------------------------------------------------------------------
# フィクスチャ
# ---------------------------------------------------------------------------

@pytest.fixture
def book(db):
    from tests.factories import make_book
    return make_book("マタイによる福音書", "口語訳", 1, slug="matthew")


@pytest.fixture
def chapter(book):
    from bible.models import Chapter
    return Chapter.objects.create(book=book, number=1)


@pytest.fixture
def verse(chapter):
    from bible.models import Verse
    return Verse.objects.create(chapter=chapter, number=1, text="アブラハムの子")


@pytest.fixture
def verse2(chapter):
    from bible.models import Verse
    return Verse.objects.create(chapter=chapter, number=2, text="ダビデの子")


@pytest.fixture
def owner_client(db):
    from rest_framework.test import APIClient
    client = APIClient()
    client.post(REGISTER_URL, {"username": "owner", "email": "owner@test.com", "password": "pass12345"}, format="json")
    return client


@pytest.fixture
def member_client(db):
    from rest_framework.test import APIClient
    client = APIClient()
    client.post(REGISTER_URL, {"username": "member", "email": "member@test.com", "password": "pass12345"}, format="json")
    return client


@pytest.fixture
def anon_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def project(db, owner_client, book):
    res = owner_client.post(LIST_URL, {
        "name": "テスト翻訳プロジェクト",
        "description": "説明文",
        "source_book": str(book.id),
        "target_language": "ja",
    }, format="json")
    assert res.status_code == status.HTTP_201_CREATED
    return res.data


@pytest.fixture
def active_project(db, owner_client, project):
    res = owner_client.post(activate_url(project["id"]))
    assert res.status_code == status.HTTP_200_OK
    return res.data


@pytest.fixture
def published_project(db, owner_client, active_project):
    res = owner_client.post(publish_url(active_project["id"]))
    assert res.status_code == status.HTTP_200_OK
    return res.data


# ---------------------------------------------------------------------------
# プロジェクト CRUD
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestTranslationProjectList:
    def test_list_excludes_draft(self, anon_client, project):
        res = anon_client.get(LIST_URL)
        assert res.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in res.data["results"]]
        assert project["id"] not in ids

    def test_list_includes_active(self, anon_client, active_project):
        res = anon_client.get(LIST_URL)
        assert res.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in res.data["results"]]
        assert active_project["id"] in ids

    def test_list_includes_published(self, anon_client, published_project):
        res = anon_client.get(LIST_URL)
        assert res.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in res.data["results"]]
        assert published_project["id"] in ids

    def test_approved_member_can_list_draft_project(self, owner_client, member_client, project):
        membership = member_client.post(join_url(project["id"]))
        # 下書きは申請を受け付けないため、テスト用に承認済みmembershipを直接作る。
        assert membership.status_code == status.HTTP_404_NOT_FOUND
        from django.contrib.auth import get_user_model

        from translations.models import TranslationMembership
        member = get_user_model().objects.get(username="member")
        TranslationMembership.objects.create(
            project_id=project["id"],
            user=member,
            role=TranslationMembership.ROLE_MEMBER,
            status=TranslationMembership.STATUS_APPROVED,
        )

        res = member_client.get(LIST_URL, {"status": "draft"})

        assert project["id"] in [item["id"] for item in res.data["results"]]

    def test_status_filter_returns_only_that_column(self, db, anon_client, owner_client, book, published_project):
        # published_project とは別に、進行中プロジェクトを1件つくる。
        res_c = owner_client.post(LIST_URL, {
            "name": "進行中P", "source_book": str(book.id), "target_language": "en",
        }, format="json")
        active_id = res_c.data["id"]
        owner_client.post(activate_url(active_id))

        res = anon_client.get(LIST_URL, {"status": "published"})
        assert res.status_code == status.HTTP_200_OK
        statuses = {p["status"] for p in res.data["results"]}
        assert statuses == {"published"}
        ids = [p["id"] for p in res.data["results"]]
        assert published_project["id"] in ids
        assert active_id not in ids

    def test_search_filters_projects(self, db, anon_client, owner_client, book):
        matched = owner_client.post(LIST_URL, {
            "name": "Azuma database reading", "source_book": str(book.id), "target_language": "en",
        }, format="json").data["id"]
        owner_client.post(activate_url(matched))
        missed = owner_client.post(LIST_URL, {
            "name": "Quiet liturgy project", "source_book": str(book.id), "target_language": "en",
        }, format="json").data["id"]
        owner_client.post(activate_url(missed))

        res = anon_client.get(LIST_URL, {"status": "active", "q": "Azuma"})

        assert res.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in res.data["results"]]
        assert matched in ids
        assert missed not in ids

    def test_list_is_paginated_20_per_page(self, db, anon_client, owner_client, book):
        # 公開列を21件つくると、1ページ目20件・2ページ目1件になる。
        for i in range(21):
            res = owner_client.post(LIST_URL, {
                "name": f"公開P{i}", "source_book": str(book.id), "target_language": "en",
            }, format="json")
            pid = res.data["id"]
            owner_client.post(activate_url(pid))
            owner_client.post(publish_url(pid))
        res1 = anon_client.get(LIST_URL, {"status": "published", "page": 1})
        assert res1.data["count"] == 21
        assert len(res1.data["results"]) == 20
        res2 = anon_client.get(LIST_URL, {"status": "published", "page": 2})
        assert len(res2.data["results"]) == 1

    def test_list_query_count_does_not_grow_with_projects(
        self, db, anon_client, owner_client, book, django_assert_max_num_queries
    ):
        # 以前は1件につき4回（ユニット数・完了数・参加中か・本棚にあるか）問い合わせていたので、
        # 20件のページで80回の往復になっていた。件数が増えてもクエリ数が増えないことを確かめる。
        for i in range(10):
            pid = owner_client.post(LIST_URL, {
                "name": f"公開P{i}", "source_book": str(book.id), "target_language": "en",
            }, format="json").data["id"]
            owner_client.post(activate_url(pid))
            owner_client.post(publish_url(pid))

        with django_assert_max_num_queries(5):
            res = anon_client.get(LIST_URL, {"status": "published"})
        assert len(res.data["results"]) == 10

    def test_list_still_reports_unit_and_done_counts(self, owner_client, active_project, verse, verse2):
        # まとめて数えるようにしても、返す数字は変わらない。
        unit = owner_client.post(units_url(active_project["id"]), {"verse": str(verse.id)}, format="json").data
        owner_client.post(units_url(active_project["id"]), {"verse": str(verse2.id)}, format="json")
        owner_client.patch(
            unit_detail_url(active_project["id"], unit["id"]),
            {"status": "done", "body": "完了"},
            format="json",
        )

        res = owner_client.get(LIST_URL, {"status": "active"})
        found = next(p for p in res.data["results"] if p["id"] == active_project["id"])
        assert found["unit_count"] == 2
        assert found["done_count"] == 1
        assert found["is_member"] is True

    def test_create_requires_auth(self, anon_client, book):
        res = anon_client.post(LIST_URL, {"name": "X", "source_book": str(book.id), "target_language": "en"}, format="json")
        assert res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_create_sets_owner_membership(self, db, owner_client, book):
        res = owner_client.post(LIST_URL, {
            "name": "新プロジェクト",
            "source_book": str(book.id),
            "target_language": "ja",
        }, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        project_id = res.data["id"]
        # オーナーはメンバーとして登録済みのはず（メンバーAPIで確認）
        members_res = owner_client.get(members_url(project_id))
        assert members_res.status_code == status.HTTP_200_OK
        members = members_res.data["results"]
        assert len(members) == 1
        assert members[0]["role"] == "owner"
        assert members[0]["status"] == "approved"


@pytest.mark.django_db
class TestTranslationProjectDetail:
    def test_get_detail(self, anon_client, active_project):
        res = anon_client.get(detail_url(active_project["id"]))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["name"] == active_project["name"]

    def test_patch_by_owner(self, owner_client, project):
        res = owner_client.patch(detail_url(project["id"]), {"name": "更新後"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["name"] == "更新後"

    def test_patch_by_non_owner_forbidden(self, member_client, active_project):
        res = member_client.patch(detail_url(active_project["id"]), {"name": "不正"}, format="json")
        assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]

    def test_draft_detail_is_private_but_owner_can_view(self, anon_client, owner_client, project):
        assert anon_client.get(detail_url(project["id"])).status_code == status.HTTP_404_NOT_FOUND
        assert owner_client.get(detail_url(project["id"])).status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestTranslationStatusTransitions:
    def test_activate(self, owner_client, project):
        res = owner_client.post(activate_url(project["id"]))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "active"

    def test_publish(self, owner_client, active_project):
        res = owner_client.post(publish_url(active_project["id"]))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "published"

    def test_unpublish(self, owner_client, published_project):
        res = owner_client.post(unpublish_url(published_project["id"]))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "active"

    def test_non_owner_cannot_publish(self, member_client, active_project):
        res = member_client.post(publish_url(active_project["id"]))
        assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]


# ---------------------------------------------------------------------------
# メンバーシップ
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestTranslationMembership:
    def test_join_creates_pending_membership(self, member_client, active_project):
        res = member_client.post(join_url(active_project["id"]))
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["status"] == "pending"
        assert res.data["role"] == "member"
        detail = member_client.get(detail_url(active_project["id"]))
        assert detail.data["is_member"] is False
        assert detail.data["membership_status"] == "pending"

    def test_join_twice_returns_400(self, member_client, active_project):
        member_client.post(join_url(active_project["id"]))
        res = member_client.post(join_url(active_project["id"]))
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_join_requires_auth(self, anon_client, active_project):
        res = anon_client.post(join_url(active_project["id"]))
        assert res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_join_rejects_project_that_is_not_recruiting(self, member_client, project):
        res = member_client.post(join_url(project["id"]))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_approves_member(self, owner_client, member_client, active_project):
        join_res = member_client.post(join_url(active_project["id"]))
        membership_id = join_res.data["id"]
        res = owner_client.patch(member_detail_url(active_project["id"], membership_id), {"status": "approved"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "approved"

    def test_owner_rejects_member(self, owner_client, member_client, active_project):
        join_res = member_client.post(join_url(active_project["id"]))
        membership_id = join_res.data["id"]
        res = owner_client.patch(member_detail_url(active_project["id"], membership_id), {"status": "rejected"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "rejected"

    def test_rejected_member_can_reapply(self, owner_client, member_client, active_project):
        join_res = member_client.post(join_url(active_project["id"]))
        owner_client.patch(
            member_detail_url(active_project["id"], join_res.data["id"]),
            {"status": "rejected"},
            format="json",
        )

        res = member_client.post(join_url(active_project["id"]))

        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["status"] == "pending"

    def test_non_owner_cannot_approve(self, member_client, owner_client, active_project):
        # 別のメンバーが参加申請
        from rest_framework.test import APIClient
        another = APIClient()
        another.post(REGISTER_URL, {"username": "another", "email": "a@test.com", "password": "pass12345"}, format="json")
        join_res = another.post(join_url(active_project["id"]))
        membership_id = join_res.data["id"]
        res = member_client.patch(member_detail_url(active_project["id"], membership_id), {"status": "approved"}, format="json")
        assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]

    def test_owner_removes_member(self, owner_client, member_client, active_project):
        join_res = member_client.post(join_url(active_project["id"]))
        membership_id = join_res.data["id"]
        # まず承認
        owner_client.patch(member_detail_url(active_project["id"], membership_id), {"status": "approved"}, format="json")
        # 除名
        res = owner_client.delete(member_detail_url(active_project["id"], membership_id))
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_member_list_requires_membership(self, anon_client, active_project):
        res = anon_client.get(members_url(active_project["id"]))
        assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]


# ---------------------------------------------------------------------------
# ユニット
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestTranslationUnit:
    def test_owner_can_add_unit(self, owner_client, project, verse):
        res = owner_client.post(units_url(project["id"]), {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["verse_number"] == verse.number
        assert res.data["verse_text"] == verse.text
        assert res.data["status"] == "todo"

    def test_non_owner_cannot_add_unit(self, member_client, active_project, verse):
        res = member_client.post(units_url(active_project["id"]), {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_duplicate_verse_unit_rejected(self, owner_client, project, verse):
        owner_client.post(units_url(project["id"]), {"verse": str(verse.id)}, format="json")
        res = owner_client.post(units_url(project["id"]), {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_units_anonymous_for_active_project(self, anon_client, owner_client, active_project, verse):
        owner_client.post(units_url(active_project["id"]), {"verse": str(verse.id)}, format="json")
        res = anon_client.get(units_url(active_project["id"]))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1

    def test_draft_units_are_private(self, anon_client, owner_client, project, verse):
        unit = owner_client.post(units_url(project["id"]), {"verse": str(verse.id)}, format="json").data
        assert anon_client.get(units_url(project["id"])).status_code == status.HTTP_404_NOT_FOUND
        assert anon_client.get(unit_detail_url(project["id"], unit["id"])).status_code == status.HTTP_404_NOT_FOUND

    def test_only_owner_can_delete_unit(self, owner_client, member_client, active_project, verse):
        unit = owner_client.post(units_url(active_project["id"]), {"verse": str(verse.id)}, format="json").data
        assert member_client.delete(unit_detail_url(active_project["id"], unit["id"])).status_code == status.HTTP_403_FORBIDDEN
        assert owner_client.delete(unit_detail_url(active_project["id"], unit["id"])).status_code == status.HTTP_204_NO_CONTENT

    def test_assigned_member_can_update_body(self, owner_client, member_client, active_project, verse):
        # ユニット作成
        unit_res = owner_client.post(units_url(active_project["id"]), {"verse": str(verse.id)}, format="json")
        unit_id = unit_res.data["id"]
        # メンバー参加・承認
        join_res = member_client.post(join_url(active_project["id"]))
        owner_client.patch(member_detail_url(active_project["id"], join_res.data["id"]), {"status": "approved"}, format="json")
        # メンバーIDを取得
        from django.contrib.auth import get_user_model
        User = get_user_model()
        member_user = User.objects.get(username="member")
        # 担当者割り当て
        owner_client.post(unit_assign_url(active_project["id"], unit_id), {"user_id": str(member_user.id)}, format="json")
        # 訳文更新
        res = member_client.patch(unit_detail_url(active_project["id"], unit_id), {"body": "The son of Abraham"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["body"] == "The son of Abraham"

    def test_unit_assignment_and_verse_are_only_changed_by_dedicated_owner_actions(
        self, owner_client, member_client, active_project, verse, verse2
    ):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        member = User.objects.get(username="member")
        stranger = User.objects.create_user(
            username="stranger",
            email="stranger@test.com",
            password="pass12345",
        )
        join_res = member_client.post(join_url(active_project["id"]))
        owner_client.patch(
            member_detail_url(active_project["id"], join_res.data["id"]),
            {"status": "approved"},
            format="json",
        )

        create_res = owner_client.post(
            units_url(active_project["id"]),
            {
                "verse": str(verse.id),
                "assigned_to": str(stranger.id),
            },
            format="json",
        )
        unit_id = create_res.data["id"]
        assert create_res.status_code == status.HTTP_201_CREATED
        assert create_res.data["assigned_to"] is None

        owner_client.post(
            unit_assign_url(active_project["id"], unit_id),
            {"user_id": str(member.id)},
            format="json",
        )
        for client in (member_client, owner_client):
            res = client.patch(
                unit_detail_url(active_project["id"], unit_id),
                {
                    "body": "Allowed body update",
                    "verse": str(verse2.id),
                    "assigned_to": str(stranger.id),
                },
                format="json",
            )
            assert res.status_code == status.HTTP_200_OK
            assert str(res.data["verse"]) == str(verse.id)
            assert str(res.data["assigned_to"]) == str(member.id)

    def test_hidden_draft_unit_create_does_not_reveal_registered_verses(
        self, owner_client, member_client, project, verse, verse2
    ):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        from translations.models import TranslationMembership

        owner_client.post(units_url(project["id"]), {"verse": str(verse.id)}, format="json")
        member = get_user_model().objects.get(username="member")
        TranslationMembership.objects.create(
            project_id=project["id"],
            user=member,
            role=TranslationMembership.ROLE_MEMBER,
            status=TranslationMembership.STATUS_PENDING,
        )
        nonmember_client = APIClient()
        nonmember_client.post(
            REGISTER_URL,
            {"username": "nonmember", "email": "nonmember@test.com", "password": "pass12345"},
            format="json",
        )

        for client in (member_client, nonmember_client):
            for target_verse in (verse, verse2):
                res = client.post(
                    units_url(project["id"]),
                    {"verse": str(target_verse.id)},
                    format="json",
                )
                assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_hidden_draft_unit_mutations_do_not_reveal_valid_or_mismatched_ids(
        self, owner_client, member_client, project, verse, book
    ):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        from translations.models import TranslationMembership, TranslationUnit

        visible_unit = owner_client.post(
            units_url(project["id"]), {"verse": str(verse.id)}, format="json"
        ).data
        other_project = owner_client.post(
            LIST_URL,
            {
                "name": "Other private draft",
                "source_book": str(book.id),
                "target_language": "ja",
            },
            format="json",
        ).data
        mismatched_unit = owner_client.post(
            units_url(other_project["id"]), {"verse": str(verse.id)}, format="json"
        ).data

        User = get_user_model()
        pending = User.objects.get(username="member")
        rejected = User.objects.create_user(
            username="rejected",
            email="rejected@test.com",
            password="pass12345",
        )
        nonmember = User.objects.create_user(
            username="nonmember_unit",
            email="nonmember-unit@test.com",
            password="pass12345",
        )
        for user, membership_status in (
            (pending, TranslationMembership.STATUS_PENDING),
            (rejected, TranslationMembership.STATUS_REJECTED),
        ):
            TranslationMembership.objects.create(
                project_id=project["id"],
                user=user,
                role=TranslationMembership.ROLE_MEMBER,
                status=membership_status,
            )

        clients = [member_client]
        for user in (rejected, nonmember):
            client = APIClient()
            client.force_authenticate(user=user)
            clients.append(client)

        target_ids = (visible_unit["id"], str(uuid.uuid4()), mismatched_unit["id"])
        for client in clients:
            for unit_id in target_ids:
                patch_response = client.patch(
                    unit_detail_url(project["id"], unit_id),
                    {"body": "oracle probe"},
                    format="json",
                )
                delete_response = client.delete(unit_detail_url(project["id"], unit_id))
                assert patch_response.status_code == status.HTTP_404_NOT_FOUND
                assert delete_response.status_code == status.HTTP_404_NOT_FOUND

        assert TranslationUnit.objects.filter(pk=visible_unit["id"]).exists()
        assert TranslationUnit.objects.filter(pk=mismatched_unit["id"]).exists()


@pytest.mark.django_db
class TestDraftTranslationUuidPrivacy:
    @staticmethod
    def _request(client, method, url, payload=None):
        request = getattr(client, method)
        if payload is None:
            return request(url)
        return request(url, payload, format="json")

    def test_hidden_draft_and_unknown_project_match_across_direct_endpoints(
        self, owner_client, member_client, anon_client, project, verse, book
    ):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        from translations.models import TranslationMembership

        unit = owner_client.post(
            units_url(project["id"]), {"verse": str(verse.id)}, format="json"
        ).data
        User = get_user_model()
        pending = User.objects.get(username="member")
        rejected = User.objects.create_user(
            username="direct_rejected",
            email="direct-rejected@test.com",
            password="pass12345",
        )
        outsider = User.objects.create_user(
            username="direct_outsider",
            email="direct-outsider@test.com",
            password="pass12345",
        )
        memberships = {}
        for user, membership_status in (
            (pending, TranslationMembership.STATUS_PENDING),
            (rejected, TranslationMembership.STATUS_REJECTED),
        ):
            memberships[user.username] = TranslationMembership.objects.create(
                project_id=project["id"],
                user=user,
                role=TranslationMembership.ROLE_MEMBER,
                status=membership_status,
            )
        project_comment = owner_client.post(
            comments_url(project["id"]),
            {"body": "private project note"},
            format="json",
        ).data
        unit_comment = owner_client.post(
            unit_comments_url(project["id"], unit["id"]),
            {"body": "private unit note"},
            format="json",
        ).data

        clients = [anon_client, member_client]
        for user in (rejected, outsider):
            client = APIClient()
            client.force_authenticate(user=user)
            clients.append(client)

        membership_id = memberships[pending.username].id
        unknown_project_id = uuid.uuid4()
        probes = [
            ("get", lambda pid: detail_url(pid), None),
            ("patch", lambda pid: detail_url(pid), {"name": "oracle probe"}),
            ("delete", lambda pid: detail_url(pid), None),
            ("post", lambda pid: activate_url(pid), None),
            ("post", lambda pid: publish_url(pid), None),
            ("post", lambda pid: unpublish_url(pid), None),
            ("post", lambda pid: join_url(pid), None),
            ("get", lambda pid: members_url(pid), None),
            (
                "patch",
                lambda pid: member_detail_url(pid, membership_id),
                {"status": "approved"},
            ),
            ("delete", lambda pid: member_detail_url(pid, membership_id), None),
            ("get", lambda pid: units_url(pid), None),
            ("get", lambda pid: f"/api/translations/{pid}/units/summary/", None),
            ("get", lambda pid: unit_detail_url(pid, unit["id"]), None),
            (
                "post",
                lambda pid: units_url(pid),
                {"verse": str(verse.id)},
            ),
            (
                "post",
                lambda pid: unit_assign_url(pid, unit["id"]),
                {"user_id": None},
            ),
            ("get", lambda pid: comments_url(pid), None),
            ("get", lambda pid: unit_comments_url(pid, unit["id"]), None),
            (
                "post",
                lambda pid: comments_url(pid),
                {"body": "oracle project comment"},
            ),
            (
                "post",
                lambda pid: unit_comments_url(pid, unit["id"]),
                {"body": "oracle unit comment"},
            ),
            (
                "delete",
                lambda pid: comment_delete_url(pid, project_comment["id"]),
                None,
            ),
            (
                "delete",
                lambda pid: comment_delete_url(pid, unit_comment["id"]),
                None,
            ),
            (
                "post",
                lambda pid: f"/api/translations/{pid}/add-book/",
                {"book_id": str(book.id)},
            ),
            (
                "delete",
                lambda pid: f"/api/translations/{pid}/remove-book/",
                {"book_id": str(book.id)},
            ),
            ("post", lambda pid: f"/api/translations/{pid}/library/", None),
            ("delete", lambda pid: f"/api/translations/{pid}/library/", None),
            ("get", lambda pid: read_url(pid), None),
        ]

        for client in clients:
            for method, build_url, payload in probes:
                hidden = self._request(client, method, build_url(project["id"]), payload)
                unknown = self._request(client, method, build_url(unknown_project_id), payload)
                assert hidden.status_code == unknown.status_code
                assert hidden.data == unknown.data

    def test_approved_member_gets_403_for_owner_only_draft_operations(
        self, owner_client, member_client, project, verse, book
    ):
        from django.contrib.auth import get_user_model

        from translations.models import TranslationMembership

        approved = get_user_model().objects.get(username="member")
        membership = TranslationMembership.objects.create(
            project_id=project["id"],
            user=approved,
            role=TranslationMembership.ROLE_MEMBER,
            status=TranslationMembership.STATUS_APPROVED,
        )
        unit = owner_client.post(
            units_url(project["id"]), {"verse": str(verse.id)}, format="json"
        ).data
        probes = [
            ("patch", detail_url(project["id"]), {"name": "not allowed"}),
            ("delete", detail_url(project["id"]), None),
            ("post", activate_url(project["id"]), None),
            ("post", publish_url(project["id"]), None),
            ("post", unpublish_url(project["id"]), None),
            (
                "patch",
                member_detail_url(project["id"], membership.id),
                {"status": "rejected"},
            ),
            ("delete", member_detail_url(project["id"], membership.id), None),
            (
                "post",
                units_url(project["id"]),
                {"verse": str(verse.id)},
            ),
            (
                "post",
                unit_assign_url(project["id"], unit["id"]),
                {"user_id": None},
            ),
            (
                "post",
                f"/api/translations/{project['id']}/add-book/",
                {"book_id": str(book.id)},
            ),
            (
                "delete",
                f"/api/translations/{project['id']}/remove-book/",
                {"book_id": str(book.id)},
            ),
        ]

        for method, url, payload in probes:
            response = self._request(member_client, method, url, payload)
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_library_and_read_hide_draft_active_and_unknown_projects(
        self, owner_client, anon_client, project, book
    ):
        active = owner_client.post(
            LIST_URL,
            {
                "name": "Active but unpublished",
                "source_book": str(book.id),
                "target_language": "ja",
            },
            format="json",
        ).data
        owner_client.post(activate_url(active["id"]))

        for project_id in (project["id"], active["id"], uuid.uuid4()):
            assert owner_client.post(
                f"/api/translations/{project_id}/library/"
            ).status_code == status.HTTP_404_NOT_FOUND
            assert anon_client.get(read_url(project_id)).status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestTranslationUnitPermissions:
    def test_non_assigned_member_cannot_update(self, owner_client, member_client, active_project, verse):
        unit_res = owner_client.post(units_url(active_project["id"]), {"verse": str(verse.id)}, format="json")
        unit_id = unit_res.data["id"]
        res = member_client.patch(unit_detail_url(active_project["id"], unit_id), {"body": "不正"}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_can_assign_approved_member(self, owner_client, member_client, active_project, verse):
        unit_res = owner_client.post(units_url(active_project["id"]), {"verse": str(verse.id)}, format="json")
        unit_id = unit_res.data["id"]
        join_res = member_client.post(join_url(active_project["id"]))
        owner_client.patch(member_detail_url(active_project["id"], join_res.data["id"]), {"status": "approved"}, format="json")
        from django.contrib.auth import get_user_model
        member_user = get_user_model().objects.get(username="member")
        res = owner_client.post(unit_assign_url(active_project["id"], unit_id), {"user_id": str(member_user.id)}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["assigned_to_username"] == "member"

    def test_assigned_to_me_filter(self, owner_client, member_client, active_project, verse, verse2):
        first = owner_client.post(units_url(active_project["id"]), {"verse": str(verse.id)}, format="json").data
        owner_client.post(units_url(active_project["id"]), {"verse": str(verse2.id)}, format="json")
        join_res = member_client.post(join_url(active_project["id"]))
        owner_client.patch(member_detail_url(active_project["id"], join_res.data["id"]), {"status": "approved"}, format="json")
        from django.contrib.auth import get_user_model
        member = get_user_model().objects.get(username="member")
        owner_client.post(unit_assign_url(active_project["id"], first["id"]), {"user_id": str(member.id)}, format="json")

        res = member_client.get(units_url(active_project["id"]), {"assigned_to": "me"})

        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["id"] == first["id"]

    def test_cannot_assign_non_member(self, owner_client, member_client, active_project, verse):
        unit_res = owner_client.post(units_url(active_project["id"]), {"verse": str(verse.id)}, format="json")
        unit_id = unit_res.data["id"]
        # member_client はまだ参加していない
        from django.contrib.auth import get_user_model
        member_client.post(REGISTER_URL, {"username": "stranger", "email": "s@test.com", "password": "pass12345"}, format="json")
        stranger = get_user_model().objects.get(username="stranger")
        res = owner_client.post(unit_assign_url(active_project["id"], unit_id), {"user_id": str(stranger.id)}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# コメント
# ---------------------------------------------------------------------------

@pytest.fixture
def approved_member_setup(owner_client, member_client, active_project):
    """member_client をプロジェクトに承認済みメンバーとして追加するフィクスチャ"""
    join_res = member_client.post(join_url(active_project["id"]))
    owner_client.patch(
        member_detail_url(active_project["id"], join_res.data["id"]),
        {"status": "approved"},
        format="json",
    )
    return active_project


@pytest.mark.django_db
class TestTranslationComment:
    def test_approved_member_can_post_project_comment(self, owner_client, member_client, approved_member_setup):
        project = approved_member_setup
        res = member_client.post(comments_url(project["id"]), {"body": "プロジェクト全体への質問"}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["username"] == "member"

    def test_non_member_cannot_post_comment(self, anon_client, active_project):
        res = anon_client.post(comments_url(active_project["id"]), {"body": "不正"}, format="json")
        assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]

    def test_unapproved_member_cannot_post_comment(self, owner_client, member_client, active_project):
        member_client.post(join_url(active_project["id"]))  # pending のまま
        res = member_client.post(comments_url(active_project["id"]), {"body": "未承認"}, format="json")
        assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]

    def test_list_project_comments_anonymous(self, owner_client, member_client, approved_member_setup, anon_client):
        project = approved_member_setup
        member_client.post(comments_url(project["id"]), {"body": "コメント"}, format="json")
        res = anon_client.get(comments_url(project["id"]))
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) >= 1

    def test_draft_comments_are_private(self, anon_client, project):
        assert anon_client.get(comments_url(project["id"])).status_code == status.HTTP_404_NOT_FOUND

    def test_approved_member_can_post_unit_comment(self, owner_client, member_client, approved_member_setup, verse):
        project = approved_member_setup
        unit_res = owner_client.post(units_url(project["id"]), {"verse": str(verse.id)}, format="json")
        unit_id = unit_res.data["id"]
        res = member_client.post(unit_comments_url(project["id"], unit_id), {"body": "ユニットへの質問"}, format="json")
        assert res.status_code == status.HTTP_201_CREATED

    def test_comment_soft_delete_by_author(self, owner_client, member_client, approved_member_setup):
        project = approved_member_setup
        post_res = member_client.post(comments_url(project["id"]), {"body": "削除対象"}, format="json")
        comment_id = post_res.data["id"]
        res = member_client.delete(comment_delete_url(project["id"], comment_id))
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_comment_soft_delete_by_owner(self, owner_client, member_client, approved_member_setup):
        project = approved_member_setup
        post_res = member_client.post(comments_url(project["id"]), {"body": "削除対象"}, format="json")
        comment_id = post_res.data["id"]
        res = owner_client.delete(comment_delete_url(project["id"], comment_id))
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_other_member_cannot_delete_comment(self, owner_client, member_client, approved_member_setup):
        project = approved_member_setup
        post_res = owner_client.post(comments_url(project["id"]), {"body": "オーナーのコメント"}, format="json")
        comment_id = post_res.data["id"]
        res = member_client.delete(comment_delete_url(project["id"], comment_id))
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_disabled_in_app_preference_skips_translation_mention(
        self, owner_client, member_client, approved_member_setup, verse
    ):
        from django.contrib.auth import get_user_model

        from notifications.models import Notification

        owner = get_user_model().objects.get(username="owner")
        owner.in_app_notifications_enabled = False
        owner.save(update_fields=["in_app_notifications_enabled"])

        unit = owner_client.post(
            units_url(approved_member_setup["id"]),
            {"verse": str(verse.id)},
            format="json",
        ).data
        response = member_client.post(
            unit_comments_url(approved_member_setup["id"], unit["id"]),
            {"body": "@owner please review this translation"},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert not Notification.objects.filter(recipient=owner).exists()

    def test_email_only_translation_mention_links_to_project(
        self, owner_client, member_client, approved_member_setup, verse, settings
    ):
        from django.contrib.auth import get_user_model
        from django.core import mail

        from notifications.models import Notification

        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        owner = get_user_model().objects.get(username="owner")
        owner.in_app_notifications_enabled = False
        owner.email_notifications_enabled = True
        owner.save(update_fields=["in_app_notifications_enabled", "email_notifications_enabled"])

        unit = owner_client.post(
            units_url(approved_member_setup["id"]),
            {"verse": str(verse.id)},
            format="json",
        ).data
        response = member_client.post(
            unit_comments_url(approved_member_setup["id"], unit["id"]),
            {"body": "@owner please review this translation"},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert not Notification.objects.filter(recipient=owner).exists()
        assert len(mail.outbox) == 1
        assert f"/translations/{approved_member_setup['id']}#unit-{unit['id']}" in mail.outbox[0].body


# ---------------------------------------------------------------------------
# 閲覧（公開翻訳）
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestTranslationRead:
    def test_published_project_returns_done_units(self, owner_client, published_project, verse):
        # ユニット追加・done に更新
        unit_res = owner_client.post(units_url(published_project["id"]), {"verse": str(verse.id)}, format="json")
        unit_id = unit_res.data["id"]
        owner_client.patch(unit_detail_url(published_project["id"], unit_id), {
            "body": "The son of Abraham",
            "status": "done",
        }, format="json")
        from rest_framework.test import APIClient
        # 章を指定しないと目次（章一覧）だけが返る
        index = APIClient().get(read_url(published_project["id"]))
        assert index.status_code == status.HTTP_200_OK
        assert index.data["chapters"] == [verse.chapter.number]
        assert index.data["units"] == []
        # 章を指定するとその章の本文が返る
        res = APIClient().get(read_url(published_project["id"]), {"chapter": verse.chapter.number})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["units"]) == 1
        assert res.data["units"][0]["body"] == "The son of Abraham"

    def test_non_published_project_read_forbidden(self, owner_client, active_project):
        from rest_framework.test import APIClient
        res = APIClient().get(read_url(active_project["id"]))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_todo_units_excluded_from_read(self, owner_client, published_project, verse, verse2):
        # doneユニット
        unit1 = owner_client.post(units_url(published_project["id"]), {"verse": str(verse.id)}, format="json").data
        owner_client.patch(unit_detail_url(published_project["id"], unit1["id"]), {"status": "done", "body": "完了"}, format="json")
        # todoユニット（未完了）
        owner_client.post(units_url(published_project["id"]), {"verse": str(verse2.id)}, format="json")
        from rest_framework.test import APIClient
        res = APIClient().get(read_url(published_project["id"]), {"chapter": verse.chapter.number})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["units"]) == 1


def add_book_url(project_id):
    return f"/api/translations/{project_id}/add-book/"


@pytest.mark.django_db
class TestTranslationAddBook:
    def test_owner_can_add_book(self, owner_client, active_project, book, chapter, verse):
        res = owner_client.post(add_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["created"] >= 1

    def test_non_owner_cannot_add_book(self, auth_client, active_project, book):
        res = auth_client.post(add_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_add_book(self, api_client, active_project, book):
        res = api_client.post(add_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_idempotent(self, owner_client, active_project, book, chapter, verse):
        owner_client.post(add_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        res = owner_client.post(add_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["created"] == 0

    def test_missing_book_id_returns_400(self, owner_client, active_project):
        res = owner_client.post(add_book_url(active_project["id"]), {}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_all_verses_of_the_book_become_units(self, owner_client, active_project, book, chapter):
        # 節ごとに1件ずつ作るのをやめ、まとめて作るようにした。取りこぼしが無いことを確かめる。
        from bible.models import Verse
        from translations.models import TranslationUnit

        Verse.objects.bulk_create(
            [Verse(chapter=chapter, number=n, text=f"節{n}") for n in range(1, 31)]
        )
        res = owner_client.post(add_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")

        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["created"] == 30
        assert TranslationUnit.objects.filter(project_id=active_project["id"]).count() == 30

    def test_uses_a_constant_number_of_queries(
        self, owner_client, active_project, book, chapter, django_assert_max_num_queries
    ):
        # 以前は節1件につき SELECT+INSERT を回していたので、詩篇では約5000クエリ走っていた。
        # 節数が増えてもクエリ数が増えないことを確かめる（認証などの分を含めた上限）。
        from bible.models import Verse

        Verse.objects.bulk_create(
            [Verse(chapter=chapter, number=n, text=f"節{n}") for n in range(1, 101)]
        )
        with django_assert_max_num_queries(15):
            res = owner_client.post(add_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        assert res.data["created"] == 100

    def test_second_call_adds_only_the_new_verses(self, owner_client, active_project, book, chapter, verse):
        # 途中まで登録済みの書に節が足された場合、足りないぶんだけ増える。
        from bible.models import Verse

        owner_client.post(add_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        Verse.objects.create(chapter=chapter, number=99, text="あとから足した節")

        res = owner_client.post(add_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        assert res.data["created"] == 1


def remove_book_url(project_id):
    return f"/api/translations/{project_id}/remove-book/"


@pytest.mark.django_db
class TestTranslationRemoveBook:
    def test_owner_can_remove_book(self, owner_client, active_project, book, chapter, verse):
        owner_client.post(add_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        res = owner_client.delete(remove_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["deleted"] >= 1

    def test_non_owner_cannot_remove_book(self, auth_client, active_project, book):
        res = auth_client.delete(remove_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_remove_book(self, api_client, active_project, book):
        res = api_client.delete(remove_book_url(active_project["id"]), {"book_id": str(book.id)}, format="json")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_missing_book_id_returns_400(self, owner_client, active_project):
        res = owner_client.delete(remove_book_url(active_project["id"]), {}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# 本棚（/read に追加した公開翻訳）
# ---------------------------------------------------------------------------

LIBRARY_LIST_URL = "/api/translations/library/"


def library_url(project_id):
    return f"/api/translations/{project_id}/library/"


@pytest.mark.django_db
class TestTranslationLibrary:
    def test_add_published_appears_in_library(self, auth_client, published_project):
        res = auth_client.post(library_url(published_project["id"]))
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["is_in_library"] is True

        list_res = auth_client.get(LIBRARY_LIST_URL)
        assert list_res.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in list_res.data["results"]]
        assert published_project["id"] in ids

    def test_cannot_add_unpublished(self, auth_client, project):
        # project は draft 状態
        res = auth_client.post(library_url(project["id"]))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_add_active(self, auth_client, active_project):
        res = auth_client.post(library_url(active_project["id"]))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_library_is_per_user(self, auth_client, member_client, published_project):
        auth_client.post(library_url(published_project["id"]))
        # 別ユーザーの本棚には出ない
        res = member_client.get(LIBRARY_LIST_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["results"] == []

    def test_add_is_idempotent(self, auth_client, published_project):
        auth_client.post(library_url(published_project["id"]))
        auth_client.post(library_url(published_project["id"]))
        res = auth_client.get(LIBRARY_LIST_URL)
        ids = [p["id"] for p in res.data["results"]]
        assert ids.count(published_project["id"]) == 1

    def test_remove_from_library(self, auth_client, published_project):
        auth_client.post(library_url(published_project["id"]))
        del_res = auth_client.delete(library_url(published_project["id"]))
        assert del_res.status_code == status.HTTP_204_NO_CONTENT
        res = auth_client.get(LIBRARY_LIST_URL)
        assert published_project["id"] not in [p["id"] for p in res.data["results"]]

    def test_remove_is_idempotent(self, auth_client, published_project):
        # 未登録でも 204（冪等）
        res = auth_client.delete(library_url(published_project["id"]))
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_add_requires_auth(self, api_client, published_project):
        res = api_client.post(library_url(published_project["id"]))
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_requires_auth(self, api_client):
        res = api_client.get(LIBRARY_LIST_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED


def unit_summary_url(project_id):
    return f"/api/translations/{project_id}/units/summary/"


# ------------------------------------------------------------------
# 章で絞る／章の一覧をまとめて取る
#
# 書を丸ごと追加できるので企画全体は数千件になりうる。画面は章を選んで作業するので、
# 章ボタンを見るためだけに全節を取らなくて済むようにした。
# ------------------------------------------------------------------
@pytest.fixture
def two_chapter_units(owner_client, project, chapter, verse, verse2):
    """1章に2節、2章に1節のユニットを作る。"""
    from bible.models import Chapter, Verse
    owner_client.post(units_url(project["id"]), {"verse": str(verse.id)}, format="json")
    owner_client.post(units_url(project["id"]), {"verse": str(verse2.id)}, format="json")
    ch2 = Chapter.objects.create(book=chapter.book, number=2)
    v3 = Verse.objects.create(chapter=ch2, number=1, text="2章の節")
    owner_client.post(units_url(project["id"]), {"verse": str(v3.id)}, format="json")
    owner_client.post(activate_url(project["id"]))
    return project


@pytest.mark.django_db
class TestTranslationUnitChapterFilter:
    def test_chapter_filter_returns_only_that_chapter(self, anon_client, two_chapter_units):
        res = anon_client.get(units_url(two_chapter_units["id"]), {"chapter": 1})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 2
        assert all(u["chapter_number"] == 1 for u in res.data["results"])

    def test_without_chapter_returns_all(self, anon_client, two_chapter_units):
        res = anon_client.get(units_url(two_chapter_units["id"]))
        assert res.data["count"] == 3

    def test_invalid_chapter_is_ignored(self, anon_client, two_chapter_units):
        # 画面から来る値なので、数字でなければ絞らずに全件返す（エラーにしない）
        res = anon_client.get(units_url(two_chapter_units["id"]), {"chapter": "abc"})
        assert res.data["count"] == 3

    def test_status_filter(self, owner_client, two_chapter_units):
        unit = owner_client.get(units_url(two_chapter_units["id"])).data["results"][0]
        owner_client.patch(
            unit_detail_url(two_chapter_units["id"], unit["id"]),
            {"status": "review", "body": "訳文"},
            format="json",
        )
        res = owner_client.get(units_url(two_chapter_units["id"]), {"status": "review"})
        assert res.data["count"] == 1

    def test_one_chapter_fits_in_a_single_page(self, anon_client, owner_client, project, chapter):
        # 章の途中でページが切れると翻訳画面が使いものにならない。
        from bible.models import Verse
        for n in range(2, 130):
            v = Verse.objects.create(chapter=chapter, number=n, text=f"節{n}")
            owner_client.post(units_url(project["id"]), {"verse": str(v.id)}, format="json")
        owner_client.post(activate_url(project["id"]))
        res = anon_client.get(units_url(project["id"]), {"chapter": chapter.number})
        assert res.data["count"] == 128
        assert len(res.data["results"]) == 128
        assert res.data["next"] is None


@pytest.mark.django_db
class TestTranslationUnitSummary:
    def test_returns_chapters_and_status_counts(self, anon_client, two_chapter_units):
        res = anon_client.get(unit_summary_url(two_chapter_units["id"]))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["chapters"] == [1, 2]
        assert res.data["total"] == 3
        assert res.data["status_counts"]["todo"] == 3
        assert res.data["status_counts"]["review"] == 0
        assert res.data["chapter_summaries"] == [
            {"number": 1, "total": 2, "status_counts": {"todo": 2, "in_progress": 0, "review": 0, "done": 0}},
            {"number": 2, "total": 1, "status_counts": {"todo": 1, "in_progress": 0, "review": 0, "done": 0}},
        ]

    def test_review_count_reflects_updates(self, owner_client, anon_client, two_chapter_units):
        unit = owner_client.get(units_url(two_chapter_units["id"])).data["results"][0]
        owner_client.patch(
            unit_detail_url(two_chapter_units["id"], unit["id"]),
            {"status": "review", "body": "訳文"},
            format="json",
        )
        res = anon_client.get(unit_summary_url(two_chapter_units["id"]))
        assert res.data["status_counts"]["review"] == 1

    def test_unknown_project_is_404(self, anon_client):
        res = anon_client.get(unit_summary_url("00000000-0000-0000-0000-000000000000"))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_empty_project_has_no_chapters(self, owner_client, project):
        res = owner_client.get(unit_summary_url(project["id"]))
        assert res.data["chapters"] == []
        assert res.data["total"] == 0

    def test_draft_summary_is_private(self, anon_client, project):
        assert anon_client.get(unit_summary_url(project["id"])).status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestTranslationReadChapter:
    def test_index_returns_only_chapters_of_done_units(self, owner_client, published_project, verse, verse2):
        from rest_framework.test import APIClient
        u1 = owner_client.post(units_url(published_project["id"]), {"verse": str(verse.id)}, format="json").data
        owner_client.patch(unit_detail_url(published_project["id"], u1["id"]), {"status": "done", "body": "完了"}, format="json")
        # 未完了の節は目次にも本文にも出さない
        owner_client.post(units_url(published_project["id"]), {"verse": str(verse2.id)}, format="json")

        res = APIClient().get(read_url(published_project["id"]))
        assert res.data["chapters"] == [verse.chapter.number]
        assert res.data["units"] == []

    def test_other_chapter_is_not_returned(self, owner_client, published_project, verse, chapter):
        from rest_framework.test import APIClient

        from bible.models import Chapter, Verse
        u1 = owner_client.post(units_url(published_project["id"]), {"verse": str(verse.id)}, format="json").data
        owner_client.patch(unit_detail_url(published_project["id"], u1["id"]), {"status": "done", "body": "1章"}, format="json")
        ch2 = Chapter.objects.create(book=chapter.book, number=2)
        v2 = Verse.objects.create(chapter=ch2, number=1, text="2章の節")
        u2 = owner_client.post(units_url(published_project["id"]), {"verse": str(v2.id)}, format="json").data
        owner_client.patch(unit_detail_url(published_project["id"], u2["id"]), {"status": "done", "body": "2章"}, format="json")

        res = APIClient().get(read_url(published_project["id"]), {"chapter": 2})
        assert res.data["chapters"] == [1, 2]
        assert len(res.data["units"]) == 1
        assert res.data["units"][0]["body"] == "2章"

    def test_invalid_chapter_returns_no_units(self, owner_client, published_project, verse):
        from rest_framework.test import APIClient
        u1 = owner_client.post(units_url(published_project["id"]), {"verse": str(verse.id)}, format="json").data
        owner_client.patch(unit_detail_url(published_project["id"], u1["id"]), {"status": "done", "body": "完了"}, format="json")
        res = APIClient().get(read_url(published_project["id"]), {"chapter": "abc"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["units"] == []


# ------------------------------------------------------------------
# 上限のない一覧をページングする
#
# コメント・メンバー・本棚は利用者が好きなだけ増やせるのに、1回のリクエストで
# 全件返していた。1回で返る件数に上限があることを確かめる。
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestUnboundedListsArePaginated:
    def test_project_comments_are_paginated(self, member_client, approved_member_setup):
        project = approved_member_setup
        for i in range(25):
            member_client.post(comments_url(project["id"]), {"body": f"意見{i}"}, format="json")

        res = member_client.get(comments_url(project["id"]))

        assert res.data["count"] == 25
        assert len(res.data["results"]) == 20
        assert res.data["next"] is not None

    def test_members_are_paginated(self, owner_client, active_project):
        res = owner_client.get(members_url(active_project["id"]))
        assert res.data["count"] == 1
        assert len(res.data["results"]) == 1

    def test_library_is_paginated(self, auth_client, published_project):
        auth_client.post(library_url(published_project["id"]))
        res = auth_client.get(LIBRARY_LIST_URL)
        assert res.data["count"] == 1
        assert len(res.data["results"]) == 1
