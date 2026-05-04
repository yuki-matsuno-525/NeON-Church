import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

REGISTER_URL = "/api/auth/register/"


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client() -> APIClient:
    """Cookie を保持するステートフルな DRF テストクライアント。"""
    return APIClient()


@pytest.fixture
def user_payload() -> dict:
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
    }


@pytest.fixture
def other_user_payload() -> dict:
    return {
        "username": "otheruser",
        "email": "other@example.com",
        "password": "otherpass123",
    }


@pytest.fixture
def auth_client(db, user_payload) -> APIClient:
    """
    登録済み・ログイン済みの独立したクライアント。
    api_client とは別インスタンスを使うため、同一テスト内で
    api_client を「匿名クライアント」として使える。
    """
    client = APIClient()
    client.post(REGISTER_URL, user_payload, format="json")
    return client


# ------------------------------------------------------------------
# 聖書データフィクスチャ（複数テストファイルで共用）
# ------------------------------------------------------------------
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
    return Verse.objects.create(
        chapter=chapter,
        number=1,
        text="アブラハムの子であるダビデの子、イエス・キリストの系図。",
    )
