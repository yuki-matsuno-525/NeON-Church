import pytest
from rest_framework.test import APIClient


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
