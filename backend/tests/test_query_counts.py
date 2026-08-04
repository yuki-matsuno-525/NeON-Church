"""一覧 API のクエリ数が件数に比例しないことを確かめる。

このプロジェクトでは N+1 を何度か手で潰してきた（翻訳企画の一覧で1件につき
4回数えていた、お気に入りの節本文を1件ずつ引いていた、など）。潰したことを
コードのコメントに書いても、次に selectors を触った人が select_related や
annotate を落とせば黙って戻る。

そこで「件数を増やしてもクエリ数が変わらない」という形で押さえる。
絶対値ではなく増分を見るので、無関係な最適化でテストが落ちない。
"""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from tests.conftest import REGISTER_URL
from tests.factories import make_book, make_comment


@pytest.fixture
def other_auth_client(db, other_user_payload) -> APIClient:
    """2人目のログイン済みクライアント。通知を発生させる側で使う。"""
    client = APIClient()
    client.post(REGISTER_URL, other_user_payload, format="json")
    return client


def _queries_for(request_fn) -> int:
    """リクエスト1回で走ったクエリ数を返す。"""
    with CaptureQueriesContext(connection) as captured:
        response = request_fn()
    assert response.status_code == 200, response.status_code
    return len(captured)


def assert_flat(request_fn, add_row):
    """1件のときと3件のときでクエリ数が同じことを確かめる。

    request_fn: 対象の一覧を取りにいく関数
    add_row:    一覧に出る行を1件足す関数
    """
    add_row()
    baseline = _queries_for(request_fn)

    add_row()
    add_row()
    grown = _queries_for(request_fn)

    assert grown == baseline, (
        f"件数を増やしたらクエリが {baseline} → {grown} に増えた。"
        " select_related / prefetch_related / annotate が外れていないか確認する。"
    )


@pytest.mark.django_db
def test_bookmark_list_does_not_scale_with_rows(auth_client):
    """お気に入り一覧。節本文はサブクエリで引くので件数に比例しない。"""
    from bible.models import Chapter, Verse

    book = make_book("創世記", "口語訳", 1, slug="genesis")
    chapter = Chapter.objects.create(book=book, number=1)
    counter = iter(range(1, 100))

    def add_bookmark():
        number = next(counter)
        verse = Verse.objects.create(chapter=chapter, number=number, text=f"本文{number}")
        auth_client.post("/api/bookmarks/", {"verse": str(verse.id)}, format="json")

    assert_flat(
        lambda: auth_client.get("/api/bookmarks/"),
        add_bookmark,
    )


@pytest.mark.django_db
def test_comment_list_does_not_scale_with_rows(auth_client, verse):
    """コメント一覧。高評価数・返信数は本体クエリで数える。"""
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.get(username="testuser")

    def add_comment():
        make_comment(user=user, verse=verse, body="本文")

    assert_flat(
        lambda: auth_client.get(f"/api/comments/?verse_id={verse.id}"),
        add_comment,
    )


@pytest.mark.django_db
def test_translation_project_list_does_not_scale_with_rows(auth_client, book):
    """翻訳企画の一覧。ユニット数・完了数・参加中か・本棚にあるかを本体クエリで求める。

    ここはシリアライザ側で数えていた時期があり、20件のページで80回の往復に
    なっていた（translations/selectors.annotate_project_summary のコメント参照）。
    """
    counter = iter(range(1, 100))

    def add_project():
        auth_client.post(
            "/api/translations/",
            {
                "name": f"企画{next(counter)}",
                "description": "",
                "source_book": str(book.id),
                "target_language": "en",
            },
            format="json",
        )

    assert_flat(
        lambda: auth_client.get("/api/translations/"),
        add_project,
    )


@pytest.mark.django_db
def test_notification_list_does_not_scale_with_rows(auth_client, other_auth_client, verse):
    """通知一覧。返信元の箇所へ飛ぶための親を2段先読みしている。"""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    owner = User.objects.get(username="testuser")
    parent = make_comment(user=owner, verse=verse, body="親")

    def add_notification():
        other_auth_client.post(
            "/api/comments/",
            {"verse": str(verse.id), "parent": str(parent.id), "body": "返信"},
            format="json",
        )

    assert_flat(
        lambda: auth_client.get("/api/notifications/"),
        add_notification,
    )
