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
    from bible.models import Book
    return Book.objects.create(name="マタイによる福音書", translation="口語訳", order=1)


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
        "target_language": "現代日本語",
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
        ids = [p["id"] for p in res.data]
        assert project["id"] not in ids

    def test_list_includes_active(self, anon_client, active_project):
        res = anon_client.get(LIST_URL)
        assert res.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in res.data]
        assert active_project["id"] in ids

    def test_list_includes_published(self, anon_client, published_project):
        res = anon_client.get(LIST_URL)
        assert res.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in res.data]
        assert published_project["id"] in ids

    def test_create_requires_auth(self, anon_client, book):
        res = anon_client.post(LIST_URL, {"name": "X", "source_book": str(book.id), "target_language": "English"}, format="json")
        assert res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_create_sets_owner_membership(self, db, owner_client, book):
        res = owner_client.post(LIST_URL, {
            "name": "新プロジェクト",
            "source_book": str(book.id),
            "target_language": "現代日本語",
        }, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        project_id = res.data["id"]
        # オーナーはメンバーとして登録済みのはず（メンバーAPIで確認）
        members_res = owner_client.get(members_url(project_id))
        assert members_res.status_code == status.HTTP_200_OK
        assert len(members_res.data) == 1
        assert members_res.data[0]["role"] == "owner"
        assert members_res.data[0]["status"] == "approved"


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

    def test_join_twice_returns_400(self, member_client, active_project):
        member_client.post(join_url(active_project["id"]))
        res = member_client.post(join_url(active_project["id"]))
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_join_requires_auth(self, anon_client, active_project):
        res = anon_client.post(join_url(active_project["id"]))
        assert res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

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
        assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]

    def test_duplicate_verse_unit_rejected(self, owner_client, project, verse):
        owner_client.post(units_url(project["id"]), {"verse": str(verse.id)}, format="json")
        res = owner_client.post(units_url(project["id"]), {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_units_anonymous(self, anon_client, owner_client, project, verse):
        owner_client.post(units_url(project["id"]), {"verse": str(verse.id)}, format="json")
        res = anon_client.get(units_url(project["id"]))
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1

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
        res = APIClient().get(read_url(published_project["id"]))
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1
        assert res.data[0]["body"] == "The son of Abraham"

    def test_non_published_project_read_forbidden(self, owner_client, active_project):
        from rest_framework.test import APIClient
        res = APIClient().get(read_url(active_project["id"]))
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_todo_units_excluded_from_read(self, owner_client, published_project, verse, verse2):
        # doneユニット
        unit1 = owner_client.post(units_url(published_project["id"]), {"verse": str(verse.id)}, format="json").data
        owner_client.patch(unit_detail_url(published_project["id"], unit1["id"]), {"status": "done", "body": "完了"}, format="json")
        # todoユニット（未完了）
        owner_client.post(units_url(published_project["id"]), {"verse": str(verse2.id)}, format="json")
        from rest_framework.test import APIClient
        res = APIClient().get(read_url(published_project["id"]))
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1


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
